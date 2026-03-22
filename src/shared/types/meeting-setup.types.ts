/**
 * Meeting Setup Types
 * Types for the multi-step meeting setup flow
 */

export interface ProbingQuestion {
  question: string;
  type: 'single-choice' | 'multi-choice';
  options: string[];
  answer: string; // comma-separated for multi-choice
  customAnswer?: string; // 5th "other" option for custom input
}

export interface MeetingSetup {
  name: string;
  description: string;
  questions: ProbingQuestion[];
  checklist: string[];
}

export interface MeetingSetupStep {
  step: 'sources' | 'info' | 'questions' | 'checklist' | 'ready';
}

// Response types for LLM calls
export interface ProbingQuestionsResponse {
  questions: Array<{
    question: string;
    type: 'single-choice' | 'multi-choice';
    options: string[];
    answer: string;
  }>;
}

export interface ChecklistResponse {
  checklist: string[];
}
