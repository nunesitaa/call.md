import React from 'react';
import { ArrowLeft, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface ChecklistStepProps {
  name: string;
  description: string;
  checklist: string[];
  isStarting: boolean;
  onBack: () => void;
  onStart: () => void;
}

export function ChecklistStep({
  name,
  description,
  checklist,
  isStarting,
  onBack,
  onStart,
}: ChecklistStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Ready to Start</h2>
        <p className="text-muted-foreground">
          Your meeting checklist is ready
        </p>
      </div>

      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Meeting Checklist ({checklist.length} items)
            </p>
            <ul className="space-y-2">
              {checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 w-full max-w-lg pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isStarting}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onStart}
          disabled={isStarting}
          className="flex-1 bg-red-600 hover:bg-red-700"
          size="lg"
        >
          <Play className="mr-2 h-4 w-4 fill-current" />
          {isStarting ? 'Starting...' : 'Start Recording'}
        </Button>
      </div>
    </div>
  );
}
