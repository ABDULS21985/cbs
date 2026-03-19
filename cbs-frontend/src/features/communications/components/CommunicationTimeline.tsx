import { Mail, MessageSquare, Bell, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import type { Communication } from '../api/communicationApi';

const channelIcons = { EMAIL: Mail, SMS: MessageSquare, PUSH: Bell, LETTER: FileText };
const statusIcons = { DELIVERED: CheckCircle, FAILED: XCircle, SCHEDULED: Clock, BOUNCED: AlertTriangle, SENT: CheckCircle, DRAFT: FileText };
const statusColors = { DELIVERED: 'text-green-500', FAILED: 'text-red-500', BOUNCED: 'text-amber-500', SENT: 'text-blue-500', SCHEDULED: 'text-gray-400', DRAFT: 'text-gray-400' };

interface Props {
  communications: Communication[];
  onItemClick?: (item: Communication) => void;
}

export function CommunicationTimeline({ communications, onItemClick }: Props) {
  if (!communications.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No communications found</p>;
  }

  return (
    <div className="space-y-3">
      {communications.map((comm, idx) => {
        const ChannelIcon = channelIcons[comm.channel] || Mail;
        const StatusIcon = statusIcons[comm.deliveryStatus] || Clock;
        const statusColor = statusColors[comm.deliveryStatus] || 'text-gray-400';

        return (
          <div
            key={comm.id}
            onClick={() => onItemClick?.(comm)}
            className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ChannelIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{comm.subject || comm.channel + ' Message'}</span>
                <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${statusColor}`} />
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{comm.messagePreview}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDateTime(comm.sentAt || comm.createdAt)} · {comm.deliveryStatus.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
