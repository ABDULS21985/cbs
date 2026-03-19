import { Pause, Play, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledNotification, NotificationChannel } from '../../api/notificationAdminApi';

interface ScheduledNotificationsTableProps {
  scheduled: ScheduledNotification[];
  onToggle: (id: string) => void;
  onEdit?: (s: ScheduledNotification) => void;
}

const channelBadge: Record<NotificationChannel, string> = {
  EMAIL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const frequencyLabel: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

const frequencyBadge: Record<string, string> = {
  DAILY: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  WEEKLY: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  MONTHLY: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function formatRunDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ScheduledNotificationsTable({ scheduled, onToggle, onEdit }: ScheduledNotificationsTableProps) {
  if (scheduled.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No scheduled notifications configured.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Template</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Next Run</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Last Run</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Recipients</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {scheduled.map((sched) => (
            <tr key={sched.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">{sched.name}</span>
              </td>
              <td className="px-4 py-3">
                <p className="text-foreground">{sched.templateName}</p>
                <p className="text-xs text-muted-foreground font-mono">{sched.templateCode}</p>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  channelBadge[sched.channel],
                )}>
                  {sched.channel.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  frequencyBadge[sched.frequency] ?? 'bg-gray-100 text-gray-600',
                )}>
                  {frequencyLabel[sched.frequency] ?? sched.frequency}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatRunDate(sched.nextRun)}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {formatRunDate(sched.lastRun)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {sched.recipientCount.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    sched.status === 'ACTIVE' ? 'bg-green-500' : 'bg-amber-500',
                  )} />
                  <span className={cn(
                    'text-xs font-medium',
                    sched.status === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
                  )}>
                    {sched.status === 'ACTIVE' ? 'Active' : 'Paused'}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(sched)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit schedule"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onToggle(sched.id)}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      sched.status === 'ACTIVE'
                        ? 'hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-900/20'
                        : 'hover:bg-green-50 text-green-600 dark:hover:bg-green-900/20',
                    )}
                    title={sched.status === 'ACTIVE' ? 'Pause schedule' : 'Resume schedule'}
                  >
                    {sched.status === 'ACTIVE' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
