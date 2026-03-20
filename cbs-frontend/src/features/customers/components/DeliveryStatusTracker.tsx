import { cn } from '@/lib/utils';
import { Check, Send, Eye, X, AlertTriangle, Clock } from 'lucide-react';

const STAGES = [
  { key: 'PENDING', label: 'Queued', icon: Clock },
  { key: 'SENT', label: 'Sent', icon: Send },
  { key: 'DELIVERED', label: 'Delivered', icon: Check },
  { key: 'READ', label: 'Read', icon: Eye },
];

const FAIL_STATUSES = ['FAILED', 'BOUNCED'];

interface DeliveryStatusTrackerProps {
  status: string;
  compact?: boolean;
}

export function DeliveryStatusTracker({ status, compact }: DeliveryStatusTrackerProps) {
  const isFailed = FAIL_STATUSES.includes(status);
  const currentIdx = STAGES.findIndex((s) => s.key === status);

  if (isFailed) {
    return (
      <div className="flex items-center gap-1.5">
        {status === 'BOUNCED' ? (
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        ) : (
          <X className="w-4 h-4 text-red-600" />
        )}
        <span className={cn('text-xs font-medium', status === 'BOUNCED' ? 'text-amber-600' : 'text-red-600')}>
          {status}
        </span>
      </div>
    );
  }

  if (compact) {
    const stage = STAGES.find((s) => s.key === status) ?? STAGES[0];
    const Icon = stage.icon;
    const color = currentIdx >= 3 ? 'text-blue-600' : currentIdx >= 2 ? 'text-green-600' : currentIdx >= 1 ? 'text-primary' : 'text-muted-foreground';
    return (
      <div className="flex items-center gap-1">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className={cn('text-xs font-medium', color)}>{stage.label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const done = i <= currentIdx;
        const Icon = stage.icon;
        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              done ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-muted text-muted-foreground',
            )}>
              <Icon className="w-3 h-3" />
            </div>
            {i < STAGES.length - 1 && (
              <div className={cn('w-4 h-0.5', done ? 'bg-green-500' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
