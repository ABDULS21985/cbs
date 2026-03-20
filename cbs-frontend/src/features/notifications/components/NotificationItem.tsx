import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/formatters';
import { useNotifications } from '../hooks/useNotifications';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X, ExternalLink } from 'lucide-react';
import type { AppNotification } from '@/stores/notificationStore';

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
};

interface NotificationItemProps {
  notification: AppNotification;
  onClick?: () => void;
  compact?: boolean;
  showDelete?: boolean;
}

export function NotificationItem({ notification: n, onClick, compact, showDelete = true }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const { icon: Icon, color, bg } = typeConfig[n.type] || typeConfig.info;

  const handleClick = () => {
    if (!n.read) markAsRead(n.id);
    onClick?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(n.id);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group flex items-start gap-3 w-full px-4 text-left transition-all duration-200 hover:shadow-sm relative',
        compact ? 'py-2.5' : 'py-3.5',
        !n.read && 'bg-primary/5 border-l-2 border-l-primary',
        n.read && 'border-l-2 border-l-transparent',
      )}
    >
      {/* Type icon with background circle */}
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm truncate', !n.read ? 'font-semibold text-foreground' : 'text-foreground/80')}>{n.title}</p>
          {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
          {n.actionUrl && <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
        </div>
        <p className={cn('text-xs text-muted-foreground mt-0.5', compact ? 'line-clamp-1' : 'line-clamp-2')}>{n.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{formatRelative(n.createdAt)}</p>
      </div>

      {/* Delete on hover */}
      {showDelete && (
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
          title="Delete"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </button>
  );
}
