import {
  FileText, CreditCard, AlertTriangle, CheckCircle2, XCircle,
  Shield, Scale, Search, ArrowUpRight, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import type { DisputeTimeline as TimelineEntry } from '../types/cardExt';
import { getTimelineActor, getTimelineTimestamp } from '../types/cardExt';

// Map action keywords to icons and colors
function getEventStyle(action: string): { icon: React.ElementType; color: string; bg: string } {
  const a = action.toUpperCase();
  if (a.includes('RESOLVE') && (a.includes('CUSTOMER') || a.includes('FAVOUR')))
    return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
  if (a.includes('RESOLVE') && a.includes('MERCHANT'))
    return { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
  if (a.includes('CREDIT') && !a.includes('REVERSE'))
    return { icon: CreditCard, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
  if (a.includes('REVERSE') || a.includes('SLA') || a.includes('BREACH'))
    return { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
  if (a.includes('CHARGEBACK'))
    return { icon: Shield, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
  if (a.includes('REPRESENTMENT'))
    return { icon: Scale, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
  if (a.includes('ARBITRATION') || a.includes('ESCALAT'))
    return { icon: ArrowUpRight, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
  if (a.includes('INVESTIGAT'))
    return { icon: Search, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
  if (a.includes('CLOSE'))
    return { icon: CheckCircle2, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' };
  if (a.includes('OPEN') || a.includes('INITIATE') || a.includes('FILE'))
    return { icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
  return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' };
}

interface DisputeTimelineProps {
  events: TimelineEntry[];
}

export function DisputeTimelineView({ events }: DisputeTimelineProps) {
  // Newest first
  const sorted = [...events].sort((a, b) => new Date(getTimelineTimestamp(b)).getTime() - new Date(getTimelineTimestamp(a)).getTime());

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No timeline events recorded.</p>;
  }

  return (
    <div className="space-y-0">
      {sorted.map((event, idx) => {
        const { icon: Icon, color, bg } = getEventStyle(event.action);
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              {idx < sorted.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="pb-5 min-w-0">
              <p className="text-sm font-medium">{event.action}</p>
              {event.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.notes}</p>}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{getTimelineActor(event)}</span>
                <span>·</span>
                <span>{formatDateTime(getTimelineTimestamp(event))}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
