import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledNotification } from '../../api/notificationAdminApi';

interface ScheduledNotificationsTableProps {
  scheduled: ScheduledNotification[];
  onToggle: (id: number | string) => void;
}

function cronToHuman(cron?: string): string {
  if (!cron) return '—';
  if (cron.includes('0 9 * * *')) return 'Every day at 9:00 AM';
  if (cron.includes('0 0 * * 1')) return 'Every Monday at midnight';
  if (cron.includes('0 0 1 * *')) return 'First day of month at midnight';
  return cron;
}

export function ScheduledNotificationsTable({ scheduled, onToggle }: ScheduledNotificationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Template</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Schedule</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Next Run</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Recipients</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {scheduled.map(s => (
            <tr key={s.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">{s.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.templateCode}</td>
              <td className="px-4 py-3 text-xs">
                <div>{s.frequency}</div>
                <div className="text-muted-foreground mt-0.5">{cronToHuman(s.cronExpression)}</div>
              </td>
              <td className="px-4 py-3 text-xs whitespace-nowrap">{s.nextRun || '—'}</td>
              <td className="px-4 py-3 text-center">{s.recipientCount?.toLocaleString() || '—'}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  s.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400')}>
                  {s.status}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button onClick={() => onToggle(s.id)}
                  className={cn('p-1.5 rounded-md transition-colors', s.status === 'ACTIVE' ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600')}
                  title={s.status === 'ACTIVE' ? 'Pause' : 'Resume'}>
                  {s.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </td>
            </tr>
          ))}
          {scheduled.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No scheduled notifications.</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
