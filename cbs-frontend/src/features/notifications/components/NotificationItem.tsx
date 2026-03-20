import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/formatters';
import { useNotifications } from '../hooks/useNotifications';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { AppNotification } from '@/stores/notificationStore';

const typeConfig: Record<string, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: 'text-blue-500' },
  success: { icon: CheckCircle, color: 'text-green-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500' },
  error: { icon: AlertCircle, color: 'text-red-500' },
};

interface NotificationItemProps {
  notification: AppNotification;
  onClick?: () => void;
}

export function NotificationItem({ notification: n, onClick }: NotificationItemProps) {
  const { markAsRead } = useNotifications();
  const { icon: Icon, color } = typeConfig[n.type] || typeConfig.info;

  const handleClick = () => {
    if (!n.read) markAsRead(n.id);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn('flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors', !n.read && 'bg-primary/5')}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm truncate', !n.read && 'font-semibold')}>{n.title}</p>
          {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-xs text-muted-foreground mt-1">{formatRelative(n.createdAt)}</p>
      </div>
    </button>
  );
}
