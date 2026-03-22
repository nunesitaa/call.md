import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface InfoStepProps {
  initialName: string;
  initialDescription: string;
  isGenerating: boolean;
  onBack: () => void;
  onNext: (name: string, description: string) => void;
}

export function InfoStep({
  initialName,
  initialDescription,
  isGenerating,
  onBack,
  onNext,
}: InfoStepProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const canContinue = name.trim().length > 0 && description.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canContinue && !isGenerating) {
      onNext(name.trim(), description.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Meeting Details</h2>
        <p className="text-muted-foreground">
          Tell us about your meeting so we can prepare better
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <Label htmlFor="meeting-name">Meeting Name</Label>
          <Input
            id="meeting-name"
            placeholder="e.g., Q4 Planning Session"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isGenerating}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meeting-description">Description</Label>
          <Textarea
            id="meeting-description"
            placeholder="What will be discussed in this meeting? What are the goals?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isGenerating}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {description.length < 10
              ? `At least ${10 - description.length} more characters needed`
              : 'Good description!'}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isGenerating}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            type="submit"
            disabled={!canContinue || isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
