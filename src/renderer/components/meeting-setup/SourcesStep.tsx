import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { StreamToggles } from '../recording/StreamToggles';
import { useSessionStore } from '../../stores/session.store';

interface SourcesStepProps {
  onNext: () => void;
}

export function SourcesStep({ onNext }: SourcesStepProps) {
  const { streams, toggleStream } = useSessionStore();

  const hasAnySource = streams.microphone || streams.systemAudio || streams.screen;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Recording Sources</h2>
        <p className="text-muted-foreground">
          Select which sources to capture during your meeting
        </p>
      </div>

      <StreamToggles
        streams={streams}
        onToggle={toggleStream}
        compact
      />

      <Button
        size="lg"
        onClick={onNext}
        disabled={!hasAnySource}
        className="min-w-[200px]"
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {!hasAnySource && (
        <p className="text-sm text-muted-foreground">
          Please select at least one source to continue
        </p>
      )}
    </div>
  );
}
