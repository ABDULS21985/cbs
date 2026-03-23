import { cn } from '@/lib/utils';
import type { DealStatus } from '../../api/capitalMarketsApi';

const STAGES: { key: DealStatus; label: string; short: string }[] = [
  { key: 'ORIGINATION', label: 'Origination', short: 'ORIG' },
  { key: 'STRUCTURING', label: 'Structuring', short: 'STRUCT' },
  { key: 'MARKETING', label: 'Marketing', short: 'MARKET' },
  { key: 'PRICING', label: 'Pricing', short: 'PRICE' },
  { key: 'ALLOTMENT', label: 'Allotment', short: 'ALLOT' },
  { key: 'SETTLED', label: 'Settled', short: 'SETTLE' },
];

interface DealStageProgressProps {
  status: DealStatus;
  dates?: Partial<Record<DealStatus, string>>;
}

export function DealStageProgress({ status, dates }: DealStageProgressProps) {
  const currentIdx = STAGES.findIndex((s) => s.key === status);
  const cancelled = status === 'CANCELLED';

  if (cancelled) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-center">
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">Deal Cancelled</span>
      </div>
    );
  }

  return (
    <div className="surface-card p-4 overflow-x-auto">
      <div className="flex items-center min-w-[500px]">
        {STAGES.map((stage, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const future = i > currentIdx;

          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 relative">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  done && 'bg-green-600 border-green-600 text-white',
                  active && 'bg-primary border-primary text-primary-foreground animate-pulse',
                  future && 'bg-muted border-border text-muted-foreground',
                )}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  active && 'text-primary font-bold',
                  done && 'text-green-700 dark:text-green-400',
                  future && 'text-muted-foreground',
                )}>
                  {stage.short}
                </span>
                {dates?.[stage.key] && (
                  <span className="text-[9px] text-muted-foreground">{dates[stage.key]}</span>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1',
                  i < currentIdx ? 'bg-green-600' : i === currentIdx ? 'bg-primary/30' : 'bg-border border-dashed border-t',
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
