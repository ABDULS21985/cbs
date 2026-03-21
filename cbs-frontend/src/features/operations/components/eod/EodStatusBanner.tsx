import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/formatters';
import type { EodRun, EodScheduleConfig } from '../../api/eodApi';

interface EodStatusBannerProps {
  run: EodRun | null;
  schedule: EodScheduleConfig | null;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return '--';
  const totalSeconds = seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getStatusConfig(status: EodRun['status'] | undefined) {
  switch (status) {
    case 'COMPLETED':
      return { label: 'COMPLETED', dot: '🟢', bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800', text: 'text-green-800 dark:text-green-300', pulsing: false };
    case 'RUNNING':
      return { label: 'RUNNING', dot: '🟡', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300', pulsing: true };
    case 'FAILED':
      return { label: 'FAILED', dot: '🔴', bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', text: 'text-red-800 dark:text-red-300', pulsing: false };
    case 'ROLLED_BACK':
      return { label: 'ROLLED BACK', dot: '⚫', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300', pulsing: false };
    default:
      return { label: 'IDLE', dot: '⚪', bg: 'bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300', pulsing: false };
  }
}

function getNextScheduled(schedule: EodScheduleConfig | null): string {
  if (!schedule) return '--';
  const today = new Date();
  const [h, m] = schedule.scheduledTime.split(':').map(Number);
  const scheduled = new Date(today);
  scheduled.setHours(h, m, 0, 0);
  if (scheduled <= today) scheduled.setDate(scheduled.getDate() + 1);
  const dateStr = scheduled.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${dateStr} ${timeStr} WAT`;
}

export function EodStatusBanner({ run, schedule }: EodStatusBannerProps) {
  const config = getStatusConfig(run?.status);

  const currentDuration = run?.status === 'RUNNING' && run.startedAt
    ? Math.floor((Date.now() - new Date(run.startedAt).getTime()) / 1000)
    : run?.durationSeconds;

  return (
    <div className={cn('rounded-xl border px-5 py-4', config.bg)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide',
              config.text,
            )}
          >
            <span className={cn('text-base', config.pulsing && 'animate-pulse')}>
              {config.dot}
            </span>
            {config.label}
          </span>
          {run?.businessDate && (
            <span className={cn('text-sm font-medium', config.text)}>
              — Business Date: <strong>{formatDate(run.businessDate)}</strong>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {run?.startedAt && (
            <span className={cn('text-xs', config.text)}>
              <span className="opacity-70">Started:</span>{' '}
              <strong>{formatDateTime(run.startedAt)}</strong>
            </span>
          )}
          {currentDuration !== undefined && (
            <span className={cn('font-mono font-semibold text-base', config.text)}>
              {formatDuration(currentDuration)}
            </span>
          )}
          {run && (
            <span className={cn('text-xs', config.text)}>
              {run.completedSteps}/{run.totalSteps} steps
            </span>
          )}
        </div>
      </div>

      {schedule && (
        <div className={cn('mt-2 flex flex-wrap gap-4 text-xs', config.text, 'opacity-80')}>
          <span>Next Scheduled: <strong>{getNextScheduled(schedule)}</strong></span>
          <span>Auto-trigger: <strong>{schedule.autoTrigger ? 'ENABLED' : 'DISABLED'}</strong></span>
          {schedule.autoRetry && (
            <span>Auto-retry: <strong>ON (max {schedule.maxRetries})</strong></span>
          )}
        </div>
      )}
    </div>
  );
}
