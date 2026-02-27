/**
 * Smart Card Engine Service
 *
 * Detects meaningful moments in meeting conversations using keyword patterns and LLM
 * classification. Surfaces context-aware smart cards with suggested responses
 * and follow-up questions.
 */

import { v4 as uuid } from 'uuid';
import { logger } from '../../lib/logger';
import { getLLMService } from '../llm.service';
import {
  getSmartCardsByType,
  createSmartCardTrigger,
  updateSmartCardTrigger,
} from '../../db';
import type { TranscriptSegmentData } from './transcript-buffer.service';

const log = logger.child({ module: 'smart-card-engine' });

// Types

export type TriggerCategory =
  | 'open_question'
  | 'decision_point'
  | 'concern'
  | 'risk'
  | 'commitment'
  | 'follow_up'
  | 'information_request'
  | 'silence';

export interface SmartCardContent {
  id: string;
  triggerCategory: TriggerCategory;
  title: string;
  suggestedResponses: string[];
  followUpQuestions: string[];
  referencePoints?: string[];
  avoidSaying?: string[];
  sourceDoc?: string;
  confidence: number;
}

export interface SmartCardTriggerData extends SmartCardContent {
  triggerId: string;
  triggerText: string;
  segmentId: string;
  timestamp: number;
  status: 'active' | 'pinned' | 'dismissed';
}

export interface TriggerDetectionResult {
  detected: boolean;
  triggerCategory?: TriggerCategory;
  confidence: number;
  triggerText?: string;
}

// Detection Patterns for generic meeting moments

const DETECTION_PATTERNS: Record<TriggerCategory, RegExp[]> = {
  open_question: [
    /\b(what do you think|how would|could you explain|can you clarify)\b/i,
    /\b(what's your.*opinion|how do you see|what are your thoughts)\b/i,
    /\?\s*$/,  // Ends with question mark
    /\b(wondering|curious|question about)\b/i,
  ],
  decision_point: [
    /\b(should we|do we want to|need to decide|decision|which option)\b/i,
    /\b(let's.*agree|we need to.*choose|what.*approach)\b/i,
    /\b(go with|move forward with|proceed with)\b/i,
    /\b(consensus|vote|settle on)\b/i,
  ],
  concern: [
    /\b(concerned|worried|hesitant|not sure about|skeptical)\b/i,
    /\b(issue|problem|challenge|difficult|hard to)\b/i,
    /\b(but|however|although|on the other hand)\b/i,
    /\b(risky|uncomfortable|unsure)\b/i,
  ],
  risk: [
    /\b(risk|blocker|dependency|deadline|delay)\b/i,
    /\b(might not|could fail|at risk|blocking)\b/i,
    /\b(scope creep|budget.*issue|timeline.*concern)\b/i,
    /\b(won't be able|can't complete|running out of)\b/i,
  ],
  commitment: [
    /\b(I'll|I will|we'll|we will|let me|I can)\b/i,
    /\b(take.*action|follow up|send.*over|get back)\b/i,
    /\b(by.*date|by.*end of|before.*meeting)\b/i,
    /\b(promise|commit|agree to|action item)\b/i,
  ],
  follow_up: [
    /\b(circle back|revisit|follow up|next meeting)\b/i,
    /\b(table.*for now|park.*for later|come back to)\b/i,
    /\b(schedule.*another|set up.*time|book.*slot)\b/i,
    /\b(needs more.*discussion|discuss.*further)\b/i,
  ],
  information_request: [
    /\b(send.*info|share.*document|forward.*details)\b/i,
    /\b(need.*data|look up|find out|research)\b/i,
    /\b(where can I|how do I|documentation)\b/i,
    /\b(link to|reference|resource)\b/i,
  ],
  silence: [
    // Silence is detected via timing, not text patterns
  ],
};

// Smart Card Engine Service

export class SmartCardEngineService {
  private recentTriggers: Map<string, number> = new Map(); // triggerCategory -> timestamp
  private readonly TRIGGER_COOLDOWN = 60000; // 1 minute between same type

  constructor() {}

  /**
   * Detect trigger in a segment (fast, pattern-based)
   */
  detectTriggerFast(segment: TranscriptSegmentData): TriggerDetectionResult {
    const text = segment.text.toLowerCase();

    for (const [category, patterns] of Object.entries(DETECTION_PATTERNS)) {
      if (category === 'silence') continue; // Silence is handled separately

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          // Check cooldown
          const lastTrigger = this.recentTriggers.get(category);
          if (lastTrigger && Date.now() - lastTrigger < this.TRIGGER_COOLDOWN) {
            continue;
          }

          return {
            detected: true,
            triggerCategory: category as TriggerCategory,
            confidence: 0.7,
            triggerText: segment.text,
          };
        }
      }
    }

    return { detected: false, confidence: 0 };
  }

  /**
   * Detect trigger using LLM for nuanced detection
   */
  async detectTriggerWithLLM(
    segment: TranscriptSegmentData,
    context: string
  ): Promise<TriggerDetectionResult> {
    const llm = getLLMService();

    const prompt = `Analyze this statement from a meeting for meaningful moments that could benefit from a smart prompt.

Context (recent conversation):
${context}

Current statement from ${segment.channel === 'me' ? 'You' : 'Other Participant'}: "${segment.text}"

Trigger categories:
- open_question: An unanswered question that needs addressing
- decision_point: A moment requiring a decision or agreement
- concern: Hesitation, skepticism, or worry being expressed
- risk: A potential blocker, risk, or issue being raised
- commitment: Someone making or suggesting a commitment/action item
- follow_up: Something that needs to be revisited or followed up on
- information_request: A request for information, documents, or data

Respond with JSON:
{
  "detected": true/false,
  "trigger_category": "open_question" | "decision_point" | "concern" | "risk" | "commitment" | "follow_up" | "information_request" | null,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    try {
      const response = await llm.completeJSON<{
        detected: boolean;
        trigger_category: TriggerCategory | null;
        confidence: number;
        reasoning: string;
      }>(prompt, 'You are a meeting analysis expert. Return valid JSON only.');

      if (response.success && response.data) {
        if (response.data.detected && response.data.trigger_category && response.data.confidence > 0.6) {
          return {
            detected: true,
            triggerCategory: response.data.trigger_category,
            confidence: response.data.confidence,
            triggerText: segment.text,
          };
        }
      }
    } catch (error) {
      log.warn({ error }, 'LLM trigger detection failed');
    }

    return { detected: false, confidence: 0 };
  }

  /**
   * Retrieve smart card for a trigger category
   */
  async getSmartCard(
    triggerCategory: TriggerCategory,
    triggerText: string,
    context: string
  ): Promise<SmartCardContent | null> {
    // Get smart cards from database (uses old schema with objectionType/talkTracks)
    const cards = getSmartCardsByType(triggerCategory);

    if (cards.length === 0) {
      // Generate a smart card using LLM
      return this.generateSmartCard(triggerCategory, triggerText, context);
    }

    // If multiple cards, use LLM to pick the best one
    if (cards.length > 1) {
      return this.selectBestSmartCard(cards.map(this.mapDbCardToSmartCard.bind(this)), triggerText, context);
    }

    // Single card - map from DB schema to SmartCardContent
    return this.mapDbCardToSmartCard(cards[0]);
  }

  /**
   * Map database card (old schema) to SmartCardContent (new schema)
   */
  private mapDbCardToSmartCard(card: {
    id: string;
    objectionType: string;
    title: string;
    talkTracks: string;
    followUpQuestions: string;
    proofPoints?: string | null;
    avoidSaying?: string | null;
    sourceDoc?: string | null;
  }): SmartCardContent {
    return {
      id: card.id,
      triggerCategory: card.objectionType as TriggerCategory,
      title: card.title,
      suggestedResponses: JSON.parse(card.talkTracks),
      followUpQuestions: JSON.parse(card.followUpQuestions),
      referencePoints: card.proofPoints ? JSON.parse(card.proofPoints) : undefined,
      avoidSaying: card.avoidSaying ? JSON.parse(card.avoidSaying) : undefined,
      sourceDoc: card.sourceDoc || undefined,
      confidence: 0.9,
    };
  }

  /**
   * Process a segment and potentially return a smart card trigger
   */
  async processSegment(
    segment: TranscriptSegmentData,
    context: string,
    recordingId: number,
    useLLM: boolean = false
  ): Promise<SmartCardTriggerData | null> {
    // Fast detection first
    let detection = this.detectTriggerFast(segment);

    // If not detected and LLM is enabled, try LLM
    if (!detection.detected && useLLM) {
      detection = await this.detectTriggerWithLLM(segment, context);
    }

    if (!detection.detected || !detection.triggerCategory) {
      return null;
    }

    // Update cooldown
    this.recentTriggers.set(detection.triggerCategory, Date.now());

    // Get smart card
    const smartCard = await this.getSmartCard(
      detection.triggerCategory,
      detection.triggerText || segment.text,
      context
    );

    if (!smartCard) {
      return null;
    }

    // Create trigger record (using old schema field names for DB compatibility)
    const triggerId = uuid();
    try {
      createSmartCardTrigger({
        id: triggerId,
        recordingId,
        segmentId: segment.id,
        cueCardId: smartCard.id, // Old schema name
        objectionType: detection.triggerCategory, // Old schema name
        triggerText: segment.text,
        confidence: smartCard.confidence,
        status: 'active',
        timestamp: segment.startTime,
      });
    } catch (error) {
      log.error({ error }, 'Failed to save smart card trigger');
    }

    return {
      ...smartCard,
      triggerId,
      triggerText: segment.text,
      segmentId: segment.id,
      timestamp: segment.startTime,
      status: 'active',
    };
  }

  /**
   * Generate a smart card using LLM
   */
  private async generateSmartCard(
    triggerCategory: TriggerCategory,
    triggerText: string,
    context: string
  ): Promise<SmartCardContent> {
    const llm = getLLMService();

    const categoryDescriptions: Record<TriggerCategory, string> = {
      open_question: 'An unanswered question',
      decision_point: 'A decision that needs to be made',
      concern: 'A concern or hesitation being raised',
      risk: 'A potential risk or blocker',
      commitment: 'A commitment or action item',
      follow_up: 'Something to follow up on',
      information_request: 'A request for information',
      silence: 'An awkward silence or pause',
    };

    const prompt = `Generate a smart card to help respond to this meeting moment.

Trigger type: ${triggerCategory} - ${categoryDescriptions[triggerCategory]}
Statement: "${triggerText}"

Context:
${context}

Respond with JSON:
{
  "title": "Brief title for this card",
  "suggested_responses": ["3-5 suggested responses or talking points"],
  "follow_up_questions": ["2-4 helpful questions to ask"],
  "reference_points": ["1-2 key points to keep in mind"],
  "avoid_saying": ["1-2 things to avoid"]
}`;

    try {
      const response = await llm.completeJSON<{
        title: string;
        suggested_responses: string[];
        follow_up_questions: string[];
        reference_points?: string[];
        avoid_saying?: string[];
      }>(prompt, 'You are a meeting facilitation expert. Return valid JSON only.');

      if (response.success && response.data) {
        return {
          id: `generated-${uuid()}`,
          triggerCategory,
          title: response.data.title || `Responding to ${triggerCategory.replace('_', ' ')}`,
          suggestedResponses: response.data.suggested_responses || [],
          followUpQuestions: response.data.follow_up_questions || [],
          referencePoints: response.data.reference_points,
          avoidSaying: response.data.avoid_saying,
          confidence: 0.6,
        };
      }
    } catch (error) {
      log.warn({ error }, 'Failed to generate smart card');
    }

    // Fallback
    return {
      id: `fallback-${uuid()}`,
      triggerCategory,
      title: `${triggerCategory.replace('_', ' ')} detected`,
      suggestedResponses: ['Acknowledge the point', 'Ask for clarification if needed'],
      followUpQuestions: ['Can you tell me more about that?', 'What would help here?'],
      confidence: 0.3,
    };
  }

  /**
   * Select the best smart card from multiple options
   */
  private async selectBestSmartCard(
    cards: SmartCardContent[],
    triggerText: string,
    context: string
  ): Promise<SmartCardContent> {
    const llm = getLLMService();

    const cardsContext = cards.map((card, idx) => {
      const responses = card.suggestedResponses;
      return `Card ${idx + 1} (${card.id}):\nTitle: ${card.title}\nResponses: ${responses.slice(0, 2).join('; ')}`;
    }).join('\n\n');

    const prompt = `Select the most relevant smart card for this meeting moment.

Statement: "${triggerText}"

Context:
${context}

Available smart cards:
${cardsContext}

Respond with JSON:
{
  "selected_index": 0-${cards.length - 1},
  "confidence": 0.0-1.0,
  "reasoning": "why this card is best"
}`;

    try {
      const response = await llm.completeJSON<{
        selected_index: number;
        confidence: number;
        reasoning: string;
      }>(prompt, 'You are a meeting facilitation expert. Return valid JSON only.');

      if (response.success && response.data) {
        const selectedIndex = Math.max(0, Math.min(response.data.selected_index, cards.length - 1));
        const selected = cards[selectedIndex];

        return {
          ...selected,
          confidence: response.data.confidence,
        };
      }
    } catch (error) {
      log.warn({ error }, 'Failed to select best smart card');
    }

    // Fallback to first card
    return {
      ...cards[0],
      confidence: 0.7,
    };
  }

  /**
   * Update smart card trigger status
   */
  updateTriggerStatus(triggerId: string, status: 'active' | 'pinned' | 'dismissed'): void {
    try {
      updateSmartCardTrigger(triggerId, { status });
    } catch (error) {
      log.error({ error, triggerId, status }, 'Failed to update trigger status');
    }
  }

  /**
   * Submit feedback for a smart card trigger
   */
  submitFeedback(triggerId: string, feedback: 'helpful' | 'wrong' | 'irrelevant'): void {
    try {
      updateSmartCardTrigger(triggerId, { feedback });
      log.info({ triggerId, feedback }, 'Smart card feedback submitted');
    } catch (error) {
      log.error({ error, triggerId, feedback }, 'Failed to submit feedback');
    }
  }

  /**
   * Reset cooldowns
   */
  reset(): void {
    this.recentTriggers.clear();
  }
}

// Singleton Instance

let instance: SmartCardEngineService | null = null;

export function getSmartCardEngine(): SmartCardEngineService {
  if (!instance) {
    instance = new SmartCardEngineService();
  }
  return instance;
}

export function resetSmartCardEngine(): void {
  if (instance) {
    instance.reset();
  }
  instance = null;
}

// Backwards compatibility aliases
export {
  SmartCardEngineService as CueCardEngineService,
  getSmartCardEngine as getCueCardEngine,
  resetSmartCardEngine as resetCueCardEngine,
};

export type ObjectionType = TriggerCategory;
export type CueCardContent = SmartCardContent;
export type CueCardTriggerData = SmartCardTriggerData;
export type ObjectionDetectionResult = TriggerDetectionResult;

export default SmartCardEngineService;
