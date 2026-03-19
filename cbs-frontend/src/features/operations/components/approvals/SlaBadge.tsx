import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface SlaBadgeProps {
  deadline: string;
  submittedAt: string;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function SlaBadge({ deadline, submittedAt }: SlaBadgeProps) {
  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const submittedMs = new Date(submittedAt).getTime();
  const totalMs = deadlineMs - submittedMs;
  const remainingMs = deadlineMs - now;
  const isOverdue = remainingMs < 0;
  const percentRemaining = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;

  const colorClass = isOverdue
    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    : percentRemaining > 50
    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
    : percentRemaining > 25
    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
    : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap',
        colorClass,
      )}
    >
      {isOverdue ? (
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      ) : (
        <Clock className="w-3 h-3 flex-shrink-0" />
      )}
      {isOverdue
        ? `OVERDUE (${formatDuration(remainingMs)} ago)`
        : formatDuration(remainingMs)}
    </span>
  );
}
