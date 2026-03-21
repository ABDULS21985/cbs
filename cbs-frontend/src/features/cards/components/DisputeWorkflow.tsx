import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DisputeStatus, DisputeTimeline as TimelineEntry } from '../types/cardExt';
import { getTimelineTimestamp } from '../types/cardExt';

const STAGES: { key: DisputeStatus; label: string }[] = [
  { key: 'INITIATED', label: 'Open' },
  { key: 'INVESTIGATION', label: 'Investigating' },
  { key: 'CHARGEBACK_FILED', label: 'Chargeback' },
  { key: 'REPRESENTMENT', label: 'Representment' },
  { key: 'PRE_ARBITRATION', label: 'Pre-Arbitration' },
  { key: 'ARBITRATION', label: 'Arbitration' },
  { key: 'RESOLVED_CUSTOMER', label: 'Resolved' },
];

// Terminal statuses map to the last visible stage
const TERMINAL_MAP: Record<string, number> = {
  RESOLVED_CUSTOMER: 6,
  RESOLVED_MERCHANT: 6,
  WITHDRAWN: 6,
  EXPIRED: 6,
};

interface DisputeWorkflowProps {
  currentStatus: DisputeStatus | string;
  timeline?: TimelineEntry[];
}

export function DisputeWorkflow({ currentStatus, timeline = [] }: DisputeWorkflowProps) {
  const directIdx = STAGES.findIndex(s => s.key === currentStatus);
  const currentIdx = directIdx >= 0 ? directIdx : (TERMINAL_MAP[currentStatus] ?? -1);

  // Find date for each stage from timeline
  const stageDates: Record<string, string> = {};
  timeline.forEach(e => {
    const toStatus = e.toStatus?.toUpperCase() ?? '';
    const action = e.action?.toUpperCase() ?? '';
    const ts = getTimelineTimestamp(e);
    for (const stage of STAGES) {
      if (toStatus === stage.key || action.includes(stage.key) || action.includes(stage.label.toUpperCase())) {
        if (!stageDates[stage.key] && ts) stageDates[stage.key] = ts;
      }
    }
  });
  // Always mark INITIATED from first timeline event
  if (timeline.length > 0 && !stageDates.INITIATED) {
    const firstTs = getTimelineTimestamp(timeline[timeline.length - 1]);
    if (firstTs) stageDates.INITIATED = firstTs;
  }

  return (
    <>
      {/* Desktop: Horizontal */}
      <div className="hidden md:flex items-center gap-0">
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          const date = stageDates[stage.key];

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-muted border-border text-muted-foreground',
                )}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> :
                    <span className="text-xs font-semibold">{i + 1}</span>}
                </div>
                <span className={cn('text-xs font-medium mt-1.5 text-center', isCurrent ? 'text-primary' : isFuture ? 'text-muted-foreground' : 'text-foreground')}>
                  {stage.label}
                </span>
                {date && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-1', i < currentIdx ? 'bg-green-500' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Vertical */}
      <div className="md:hidden space-y-0">
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          const date = stageDates[stage.key];

          return (
            <div key={stage.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-primary border-primary text-primary-foreground' :
                  'bg-muted border-border text-muted-foreground',
                )}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                    <span className="text-[10px] font-semibold">{i + 1}</span>}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={cn('w-0.5 flex-1 my-1', i < currentIdx ? 'bg-green-500' : 'bg-border')} />
                )}
              </div>
              <div className="pb-4">
                <span className={cn('text-sm font-medium', isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                  {stage.label}
                </span>
                {date && <span className="text-xs text-muted-foreground ml-2">{new Date(date).toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
