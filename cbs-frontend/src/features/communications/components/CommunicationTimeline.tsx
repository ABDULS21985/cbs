import { Mail, Smartphone, Bell, Monitor, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Communication } from '../api/communicationApi';
import type { NotificationLog } from '../api/communicationApi';

const channelIcons: Record<string, typeof Mail> = {
  EMAIL: Mail,
  SMS: Smartphone,
  PUSH: Bell,
  IN_APP: Monitor,
  LETTER: Mail,
};

const statusColors: Record<string, string> = {
  DELIVERED: 'text-green-600',
  READ: 'text-green-600',
  SENT: 'text-blue-600',
  PENDING: 'text-amber-600',
  SCHEDULED: 'text-amber-600',
  FAILED: 'text-red-600',
  BOUNCED: 'text-orange-600',
  DRAFT: 'text-muted-foreground',
};

const statusIcons: Record<string, typeof CheckCircle> = {
  DELIVERED: CheckCircle,
  READ: CheckCircle,
  SENT: CheckCircle,
  PENDING: Clock,
  SCHEDULED: Clock,
  FAILED: XCircle,
  BOUNCED: AlertTriangle,
  DRAFT: Clock,
};

interface CommunicationTimelineProps {
  communications?: Communication[];
  notifications?: NotificationLog[];
  onItemClick?: (item: Communication | NotificationLog) => void;
}

export function CommunicationTimeline({ communications = [], notifications = [], onItemClick }: CommunicationTimelineProps) {
  // Merge both sources into a unified timeline
  const items = [
    ...communications.map((c) => ({
      id: c.id,
      channel: c.channel,
      recipient: c.customerName,
      subject: c.subject ?? c.messagePreview,
      status: c.deliveryStatus,
      time: c.sentAt ?? c.createdAt,
      original: c as Communication | NotificationLog,
    })),
    ...notifications.map((n) => ({
      id: n.id + 100000,
      channel: n.channel,
      recipient: n.recipientName ?? n.recipientAddress ?? '—',
      subject: n.subject ?? n.eventType ?? '—',
      status: n.status,
      time: n.sentAt ?? n.createdAt,
      original: n as Communication | NotificationLog,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No communications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => {
        const ChannelIcon = channelIcons[item.channel] ?? Mail;
        const StatusIcon = statusIcons[item.status] ?? Clock;
        return (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item.original)}
            className={cn('flex gap-3 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors')}
          >
            <div className="flex flex-col items-center pt-0.5">
              <div className="p-1.5 rounded-lg bg-muted">
                <ChannelIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{item.recipient}</p>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatRelative(item.time)}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{item.subject}</p>
              <div className={cn('flex items-center gap-1 mt-0.5', statusColors[item.status] ?? 'text-muted-foreground')}>
                <StatusIcon className="w-3 h-3" />
                <span className="text-[10px] font-medium">{item.status}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
