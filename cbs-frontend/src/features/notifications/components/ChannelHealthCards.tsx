import { cn } from '@/lib/utils';
import { Mail, Smartphone, Bell, Monitor, Loader2, Globe } from 'lucide-react';
import type { ChannelDeliveryStat } from '../api/notificationAnalyticsApi';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Channel metadata
// ---------------------------------------------------------------------------

const CHANNEL_META: Record<string, { label: string; icon: LucideIcon }> = {
  EMAIL: { label: 'Email', icon: Mail },
  SMS: { label: 'SMS', icon: Smartphone },
  PUSH: { label: 'Push', icon: Bell },
  IN_APP: { label: 'In-App', icon: Monitor },
  WEBHOOK: { label: 'Webhook', icon: Globe },
};

const ALL_CHANNELS = ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK'] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChannelHealthCardsProps {
  data: ChannelDeliveryStat[] | undefined;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChannelHealthCards({ data, isLoading }: ChannelHealthCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ALL_CHANNELS.map((ch) => (
          <div key={ch} className="stat-card animate-pulse">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded mt-3" />
            <div className="h-3 w-32 bg-muted rounded mt-3" />
          </div>
        ))}
      </div>
    );
  }

  // Build a lookup map from backend data
  const byChannel = new Map<string, ChannelDeliveryStat>();
  (data || []).forEach((d) => byChannel.set(d.channel, d));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {ALL_CHANNELS.map((channel) => {
        const stat = byChannel.get(channel);
        const sent = stat?.sent ?? 0;
        const delivered = stat?.delivered ?? 0;
        const failed = stat?.failed ?? 0;
        const rate = sent > 0 ? (delivered / sent) * 100 : 0;
        const meta = CHANNEL_META[channel] || { label: channel, icon: Bell };
        const Icon = meta.icon;

        const rateColor =
          rate >= 95
            ? 'text-green-600 dark:text-green-400'
            : rate >= 90
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400';

        return (
          <div key={channel} className="stat-card" role="region" aria-label={`${meta.label} delivery health`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <span className="stat-label">{meta.label}</span>
              </div>
            </div>

            <div className={cn('text-2xl font-bold tabular-nums', rateColor)}>
              {sent > 0 ? `${rate.toFixed(1)}%` : 'N/A'}
              <span className="sr-only"> delivery rate</span>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{sent.toLocaleString()}</span> sent
              </span>
              <span>
                <span className="font-medium text-green-600 dark:text-green-400">{delivered.toLocaleString()}</span> delivered
              </span>
              <span>
                <span className="font-medium text-red-600 dark:text-red-400">{failed.toLocaleString()}</span> failed
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
