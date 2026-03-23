import { StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { Calendar, Clock, Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { channelIcon } from './ChannelSelector';
import {
  useScheduledNotifications,
  useDeleteScheduledNotification,
  useToggleScheduledNotification,
} from '../hooks/useCommunications';
import type { ScheduledNotification } from '../api/communicationApi';

export function ScheduledQueue() {
  const {
    data: scheduled = [],
    isLoading,
    isError,
  } = useScheduledNotifications();
  const deleteMut = useDeleteScheduledNotification();
  const toggleMut = useToggleScheduledNotification();

  const handleToggle = (item: ScheduledNotification) => {
    toggleMut.mutate(item.id, {
      onSuccess: () => toast.success(`Campaign ${item.status === 'ACTIVE' ? 'paused' : 'resumed'}`),
      onError: () => toast.error('Failed to toggle campaign'),
    });
  };

  const handleDelete = (item: ScheduledNotification) => {
    if (!confirm(`Delete scheduled campaign "${item.name}"?`)) return;
    deleteMut.mutate(item.id, {
      onSuccess: () => toast.success('Campaign deleted'),
      onError: () => toast.error('Failed to delete campaign'),
    });
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Scheduled notifications could not be loaded from the backend.
      </div>
    );
  }

  if (scheduled.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No scheduled campaigns</p>
        <p className="text-xs mt-1">Schedule messages from the Compose panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scheduled.map((item) => {
        const Icon = channelIcon(item.channel);
        const statusMap: Record<string, string> = {
          ACTIVE: 'ACTIVE',
          PAUSED: 'PAUSED',
          COMPLETED: 'COMPLETED',
          CANCELLED: 'CANCELLED',
        };
        return (
          <div key={item.id} className="surface-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name || 'Unnamed Campaign'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.templateCode ? `Template: ${item.templateCode}` : item.subject ?? item.eventType ?? '—'}
                  {item.recipientCount > 0 && ` · ${item.recipientCount} recipients`}
                </p>
                {item.frequency && (
                  <p className="text-[10px] text-muted-foreground">
                    {item.frequency}{item.cronExpression ? ` (${item.cronExpression})` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Clock className="w-3.5 h-3.5" />
                {item.nextRun ? formatDateTime(item.nextRun) : '—'}
              </div>
              <StatusBadge status={statusMap[item.status] ?? item.status} size="sm" />
              {/* Toggle play/pause */}
              {(item.status === 'ACTIVE' || item.status === 'PAUSED') && (
                <button
                  onClick={() => handleToggle(item)}
                  disabled={toggleMut.isPending}
                  title={item.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  className={cn(
                    'p-1.5 rounded-md hover:bg-muted transition-colors',
                    toggleMut.isPending && 'opacity-50',
                  )}
                >
                  {item.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              )}
              {/* Delete */}
              <button
                onClick={() => handleDelete(item)}
                disabled={deleteMut.isPending}
                title="Delete campaign"
                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
