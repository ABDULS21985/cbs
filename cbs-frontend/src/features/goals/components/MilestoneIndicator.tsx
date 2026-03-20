import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MilestoneIndicatorProps {
  percentage: number;
}

const MILESTONES = [25, 50, 75, 100];

export function MilestoneIndicator({ percentage }: MilestoneIndicatorProps) {
  return (
    <div className="flex items-center gap-0 w-full">
      {MILESTONES.map((ms, i) => {
        const reached = percentage >= ms;
        const isCurrent = !reached && (i === 0 ? percentage > 0 : percentage > MILESTONES[i - 1]);
        const lineWidth = i === 0 ? ms : ms - MILESTONES[i - 1];
        const lineFill = percentage >= ms ? 100 : percentage > (i === 0 ? 0 : MILESTONES[i - 1]) ? ((percentage - (i === 0 ? 0 : MILESTONES[i - 1])) / lineWidth) * 100 : 0;

        return (
          <div key={ms} className="flex items-center flex-1">
            {/* Line segment */}
            <div className="flex-1 h-0.5 bg-muted rounded-full overflow-hidden relative">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${lineFill}%` }}
              />
            </div>
            {/* Milestone dot */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center transition-all',
                  reached ? 'bg-primary text-primary-foreground' : 'bg-muted border-2 border-muted-foreground/20',
                  isCurrent && 'ring-4 ring-primary/20 animate-pulse bg-primary/20',
                )}
              >
                {reached && <Check className="w-2.5 h-2.5" />}
              </div>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground tabular-nums">{ms}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
