import { cn } from '@/lib/utils';
import { Mail, MessageSquare, Bell, Inbox, Loader2, Globe } from 'lucide-react';
import type { NotificationChannel } from '../types/notificationExt';

const CHANNEL_CONFIG: Record<NotificationChannel, { icon: typeof Mail; label: string; color: string }> = {
  EMAIL: { icon: Mail, label: 'Email', color: 'text-blue-600' },
  SMS: { icon: MessageSquare, label: 'SMS', color: 'text-green-600' },
  PUSH: { icon: Bell, label: 'Push', color: 'text-purple-600' },
  IN_APP: { icon: Inbox, label: 'In-App', color: 'text-amber-600' },
  WEBHOOK: { icon: Globe, label: 'Webhook', color: 'text-cyan-600' },
};

interface ChannelToggleCardProps {
  channel: NotificationChannel;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isLoading?: boolean;
}

export function ChannelToggleCard({ channel, description, enabled, onToggle, isLoading }: ChannelToggleCardProps) {
  const config = CHANNEL_CONFIG[channel];
  const Icon = config.icon;

  return (
    <div className={cn('surface-card p-4 transition-colors', enabled ? 'border-primary/20' : 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', enabled ? 'bg-primary/10' : 'bg-muted')}>
            <Icon className={cn('w-5 h-5', enabled ? config.color : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-sm font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          disabled={isLoading}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
            enabled ? 'bg-primary' : 'bg-muted-foreground/20',
            isLoading && 'opacity-50',
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <span className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              enabled ? 'left-[22px]' : 'left-0.5',
            )} />
          )}
        </button>
      </div>
    </div>
  );
}
