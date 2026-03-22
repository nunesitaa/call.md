import React from 'react';
import { Mic, Volume2, Monitor, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StreamState {
  microphone: boolean;
  systemAudio: boolean;
  screen: boolean;
}

interface StreamTogglesProps {
  streams: StreamState;
  onToggle: (stream: keyof StreamState) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function StreamToggles({ streams, onToggle, disabled, compact }: StreamTogglesProps) {
  const toggles = [
    {
      id: 'microphone' as const,
      icon: Mic,
      label: 'Microphone',
    },
    {
      id: 'systemAudio' as const,
      icon: Volume2,
      label: 'System Audio',
    },
    {
      id: 'screen' as const,
      icon: Monitor,
      label: 'Screen',
    },
  ];

  return (
    <div className={cn('flex gap-3', compact ? 'flex-wrap justify-center' : 'flex-col sm:flex-row')}>
      {toggles.map(({ id, icon: Icon, label }) => {
        const isActive = streams[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{label}</span>
            {isActive && (
              <Check className="h-3.5 w-3.5 ml-1" />
            )}
          </button>
        );
      })}
    </div>
  );
}
