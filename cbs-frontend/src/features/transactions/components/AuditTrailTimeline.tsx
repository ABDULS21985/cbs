import { Clock3 } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import type { TransactionAuditTrailEvent } from '../api/transactionApi';

interface AuditTrailTimelineProps {
  events: TransactionAuditTrailEvent[];
}

export function AuditTrailTimeline({ events }: AuditTrailTimelineProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No audit events yet"
        description="Posting, view, dispute, and reversal workflow events will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={`${event.eventType}-${event.timestamp}-${index}`} className="flex gap-3">
          <div className="flex w-7 flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-muted/30">
              <Clock3 className="h-3.5 w-3.5" />
            </div>
            {index < events.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
          </div>
          <div className="min-w-0 flex-1 rounded-lg border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{event.eventType.replaceAll('_', ' ')}</span>
                {event.channel && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {event.channel}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
            {event.actor && <p className="mt-1 text-xs text-muted-foreground">Actor: {event.actor}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
