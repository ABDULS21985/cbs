import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import type { TransferTimelineEntry } from '../../api/internationalPaymentApi';

interface Props {
  timeline: TransferTimelineEntry[];
}

export function TransferTracker({ timeline }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Transfer Status</h3>
      <div className="space-y-0">
        {timeline.map((entry, idx) => {
          const Icon = entry.isComplete ? CheckCircle : entry.isCurrent ? Loader2 : Circle;
          const color = entry.isComplete ? 'text-green-600' : entry.isCurrent ? 'text-blue-600' : 'text-gray-300';
          return (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Icon className={`w-5 h-5 ${color} ${entry.isCurrent ? 'animate-spin' : ''}`} />
                {idx < timeline.length - 1 && (
                  <div className={`w-px flex-1 min-h-[24px] ${entry.isComplete ? 'bg-green-300' : 'bg-border'}`} />
                )}
              </div>
              <div className="pb-4">
                <p className={`text-sm font-medium ${entry.isComplete || entry.isCurrent ? '' : 'text-muted-foreground'}`}>{entry.label}</p>
                {entry.timestamp && (
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
