import { cn } from '@/lib/utils';
import { formatRelative, formatDateTime } from '@/lib/formatters';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface AuditEvent {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string;
  changes?: { field: string; from: string; to: string }[];
}

interface AuditTimelineProps {
  events: AuditEvent[];
  isLoading?: boolean;
}

const actionColors: Record<string, string> = {
  Created: 'bg-green-500', Approved: 'bg-blue-500', Modified: 'bg-amber-500', Deleted: 'bg-red-500',
  Rejected: 'bg-red-500', Submitted: 'bg-blue-500', Activated: 'bg-green-500', Suspended: 'bg-amber-500',
};

export function AuditTimeline({ events, isLoading }: AuditTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="flex gap-3"><div className="w-2 h-2 rounded-full bg-muted animate-pulse mt-1.5" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded animate-pulse w-48" /><div className="h-3 bg-muted rounded animate-pulse w-32" /></div></div>)}</div>;
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const dotColor = Object.entries(actionColors).find(([key]) => event.action.includes(key))?.[1] || 'bg-gray-400';
        const isExpanded = expandedId === event.id;
        const hasDetails = event.changes && event.changes.length > 0;
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', dotColor)} />
              {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className="pb-6 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {hasDetails && (
                  <button onClick={() => setExpandedId(isExpanded ? null : event.id)} className="p-0.5">
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
                <span className="text-sm font-medium">{event.action}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {event.performedBy} · <span title={formatDateTime(event.performedAt)}>{formatRelative(event.performedAt)}</span>
              </div>
              {event.details && <p className="text-sm text-muted-foreground mt-1">{event.details}</p>}
              {isExpanded && event.changes && (
                <div className="mt-2 space-y-1 text-xs">
                  {event.changes.map((c, j) => (
                    <div key={j} className="flex gap-2">
                      <span className="text-muted-foreground font-medium w-24 flex-shrink-0">{c.field}</span>
                      <span className="text-red-500 line-through">{c.from}</span>
                      <span>→</span>
                      <span className="text-green-600">{c.to}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
