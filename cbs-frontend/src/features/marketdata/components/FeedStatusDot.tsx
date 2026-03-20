import React from 'react';
import { cn } from '@/lib/utils';

interface FeedStatusDotProps {
  status: string;
}

/** Coloured dot + label indicating a data feed's health. */
export const FeedStatusDot = React.memo(function FeedStatusDot({ status }: FeedStatusDotProps) {
  const color =
    status === 'ACTIVE'
      ? 'bg-green-500'
      : status === 'STALE'
        ? 'bg-amber-500'
        : 'bg-red-500';

  const textColor =
    status === 'ACTIVE'
      ? 'text-green-700'
      : status === 'STALE'
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-label={`Feed status: ${status}`}
    >
      <span className={cn('w-2 h-2 rounded-full', color)} aria-hidden="true" />
      <span className={cn('text-xs font-medium', textColor)}>{status}</span>
    </span>
  );
});
