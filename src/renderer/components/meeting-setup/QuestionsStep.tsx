import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Check, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import type { ProbingQuestion } from '../../../shared/types/meeting-setup.types';

interface QuestionsStepProps {
  questions: ProbingQuestion[];
  isGenerating: boolean;
  onBack: () => void;
  onNext: (questions: ProbingQuestion[]) => void;
  onAnswerChange: (index: number, answer: string, customAnswer?: string) => void;
}

export function QuestionsStep({
  questions,
  isGenerating,
  onBack,
  onNext,
  onAnswerChange,
}: QuestionsStepProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showCustomInput, setShowCustomInput] = useState<Record<number, boolean>>({});
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});

  const current = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  const allQuestionsAnswered = questions.every(
    (q) => q.answer.trim().length > 0 || (showCustomInput[questions.indexOf(q)] && customInputs[questions.indexOf(q)]?.trim())
  );

  const currentHasAnswer = current?.answer.trim().length > 0 ||
    (showCustomInput[currentQuestion] && customInputs[currentQuestion]?.trim());

  const handleOptionClick = (option: string) => {
    if (!current) return;

    if (current.type === 'single-choice') {
      onAnswerChange(currentQuestion, option, customInputs[currentQuestion]);
      setShowCustomInput((prev) => ({ ...prev, [currentQuestion]: false }));
    } else {
      // Multi-choice: toggle the option
      const currentAnswers = current.answer ? current.answer.split(',').map((s) => s.trim()) : [];
      const isSelected = currentAnswers.includes(option);

      const newAnswers = isSelected
        ? currentAnswers.filter((a) => a !== option)
        : [...currentAnswers, option];

      onAnswerChange(currentQuestion, newAnswers.join(','), customInputs[currentQuestion]);
    }
  };

  const handleOtherClick = () => {
    setShowCustomInput((prev) => ({ ...prev, [currentQuestion]: !prev[currentQuestion] }));
  };

  const handleCustomInputChange = (value: string) => {
    setCustomInputs((prev) => ({ ...prev, [currentQuestion]: value }));
    onAnswerChange(currentQuestion, current?.answer || '', value);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onNext(questions);
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion === 0) {
      onBack();
    } else {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const isOptionSelected = (option: string) => {
    if (!current) return false;
    if (current.type === 'single-choice') {
      return current.answer === option;
    }
    return current.answer.split(',').map((s) => s.trim()).includes(option);
  };

  if (!current) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in duration-300">
      {/* Progress indicator */}
      <div className="flex gap-2">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all duration-200',
              idx === currentQuestion
                ? 'bg-primary w-6'
                : idx < currentQuestion
                ? 'bg-primary/60'
                : 'bg-muted'
            )}
          />
        ))}
      </div>

      <div className="text-center space-y-2 max-w-lg">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Question {currentQuestion + 1} of {questions.length}
          {current.type === 'multi-choice' && ' (select multiple)'}
        </p>
        <h2 className="text-xl font-semibold tracking-tight">{current.question}</h2>
      </div>

      <div className="w-full max-w-md space-y-3">
        {current.options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleOptionClick(option)}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all duration-200',
              'hover:border-primary/50 hover:bg-muted/30',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
              isOptionSelected(option)
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                current.type === 'multi-choice' && 'rounded-md',
                isOptionSelected(option)
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/40'
              )}
            >
              {isOptionSelected(option) && (
                <Check className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
            <span className="text-sm">{option}</span>
          </button>
        ))}

        {/* Other option */}
        <button
          type="button"
          onClick={handleOtherClick}
          className={cn(
            'w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all duration-200',
            'hover:border-primary/50 hover:bg-muted/30',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
            showCustomInput[currentQuestion]
              ? 'border-primary bg-primary/10'
              : 'border-dashed border-border bg-background'
          )}
        >
          <MessageSquare className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Other (type your answer)</span>
        </button>

        {showCustomInput[currentQuestion] && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <Input
              placeholder="Type your answer..."
              value={customInputs[currentQuestion] || ''}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 w-full max-w-md pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={isGenerating}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentQuestion === 0 ? 'Back' : 'Previous'}
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!currentHasAnswer || (isLastQuestion && isGenerating)}
          className="flex-1"
        >
          {isLastQuestion ? (
            isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Checklist
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )
          ) : (
            <>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
