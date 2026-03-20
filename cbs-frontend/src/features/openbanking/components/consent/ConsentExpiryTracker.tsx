import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface ConsentExpiryTrackerProps {
  expiresAt: string;
  compact?: boolean;
}

export function ConsentExpiryTracker({ expiresAt, compact }: ConsentExpiryTrackerProps) {
  const now = new Date();
  const expiry = parseISO(expiresAt);
  const daysLeft = differenceInDays(expiry, now);

  const isExpired = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft < 7;
  const isWarning = daysLeft >= 7 && daysLeft <= 30;

  const colorClass = isExpired
    ? 'text-red-600 dark:text-red-400'
    : isUrgent
      ? 'text-red-600 dark:text-red-400'
      : isWarning
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-green-600 dark:text-green-400';

  const bgClass = isExpired
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : isUrgent
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : isWarning
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';

  const label = isExpired
    ? 'Expired'
    : daysLeft === 0
      ? 'Expires today'
      : daysLeft === 1
        ? 'Expires tomorrow'
        : `Expires in ${daysLeft} days`;

  const Icon = isUrgent || isExpired ? AlertTriangle : Clock;

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs font-medium', colorClass)}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', bgClass, colorClass)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}
