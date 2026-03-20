import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'OPEN', label: 'Open' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'BUY_IN_INITIATED', label: 'Buy-In' },
  { key: 'RESOLVED', label: 'Resolved' },
] as const;

interface FailWorkflowProps {
  currentStatus: string;
  resolvedAt?: string;
  failStartDate?: string;
}

export function FailWorkflow({ currentStatus, resolvedAt, failStartDate }: FailWorkflowProps) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStatus);

  return (
    <>
      {/* Desktop: Horizontal */}
      <div className="hidden md:flex items-center gap-0">
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors',
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse' :
                  'bg-muted border-border text-muted-foreground',
                )}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                </div>
                <span className={cn('text-xs font-medium mt-1.5 text-center', isCurrent ? 'text-primary font-semibold' : isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                  {stage.label}
                </span>
                {i === 0 && failStartDate && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">{new Date(failStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                )}
                {stage.key === 'RESOLVED' && resolvedAt && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">{new Date(resolvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-2', i < currentIdx ? 'bg-green-500' : 'bg-border')} />
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
          return (
            <div key={stage.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-primary border-primary text-primary-foreground' :
                  'bg-muted border-border text-muted-foreground',
                )}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </div>
                {i < STAGES.length - 1 && <div className={cn('w-0.5 flex-1 my-1', i < currentIdx ? 'bg-green-500' : 'bg-border')} />}
              </div>
              <div className="pb-4">
                <span className={cn('text-sm font-medium', isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
