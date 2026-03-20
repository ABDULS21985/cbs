import { Mail, Smartphone, Bell, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationChannel } from '../api/communicationApi';

const CHANNELS: { key: NotificationChannel; label: string; icon: typeof Mail }[] = [
  { key: 'EMAIL', label: 'Email', icon: Mail },
  { key: 'SMS', label: 'SMS', icon: Smartphone },
  { key: 'PUSH', label: 'Push', icon: Bell },
  { key: 'IN_APP', label: 'In-App', icon: Monitor },
];

interface ChannelSelectorProps {
  value: NotificationChannel;
  onChange: (channel: NotificationChannel) => void;
}

export function ChannelSelector({ value, onChange }: ChannelSelectorProps) {
  return (
    <div className="flex rounded-lg border overflow-hidden">
      {CHANNELS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
            value === key ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function channelIcon(channel: string) {
  switch (channel) {
    case 'EMAIL': return Mail;
    case 'SMS': return Smartphone;
    case 'PUSH': return Bell;
    case 'IN_APP': return Monitor;
    default: return Mail;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'DELIVERED': case 'READ': return 'text-green-600';
    case 'SENT': return 'text-blue-600';
    case 'PENDING': case 'SCHEDULED': return 'text-amber-600';
    case 'FAILED': return 'text-red-600';
    case 'BOUNCED': return 'text-orange-600';
    default: return 'text-muted-foreground';
  }
}
