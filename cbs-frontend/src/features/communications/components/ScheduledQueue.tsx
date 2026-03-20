import { StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { Calendar, Clock } from 'lucide-react';
import { channelIcon } from './ChannelSelector';
import { useScheduledNotifications } from '../hooks/useCommunications';

export function ScheduledQueue() {
  const { data: scheduled = [], isLoading } = useScheduledNotifications();

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  if (scheduled.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No scheduled messages</p>
        <p className="text-xs mt-1">Schedule messages from the Compose panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scheduled.map((msg) => {
        const Icon = channelIcon(msg.channel);
        return (
          <div key={msg.id} className="rounded-lg border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{msg.recipientName ?? msg.recipientAddress ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{msg.subject ?? msg.eventType ?? 'No subject'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {msg.scheduledAt ? formatDateTime(msg.scheduledAt) : '—'}
              </div>
              <StatusBadge status="SCHEDULED" size="sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
