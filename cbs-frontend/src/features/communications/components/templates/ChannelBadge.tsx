import { cn } from '@/lib/utils';

const CHANNEL_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  EMAIL: { icon: '✉️', label: 'Email', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  SMS: { icon: '📱', label: 'SMS', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  PUSH: { icon: '🔔', label: 'Push', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  IN_APP: { icon: '📄', label: 'In-App', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  WEBHOOK: { icon: '🔗', label: 'Webhook', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

export function ChannelBadge({ channel, size = 'md' }: { channel: string; size?: 'sm' | 'md' }) {
  const cfg = CHANNEL_CONFIG[channel] ?? { icon: '📨', label: channel, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded font-medium',
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      cfg.color,
    )}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}
