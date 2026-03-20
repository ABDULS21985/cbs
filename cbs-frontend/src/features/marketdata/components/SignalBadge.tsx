import React from 'react';
import { cn } from '@/lib/utils';

interface SignalBadgeProps {
  signal: string;
}

/** Colour-coded badge for BUY / SELL / HOLD signals. */
export const SignalBadge = React.memo(function SignalBadge({ signal }: SignalBadgeProps) {
  const cls =
    signal === 'BUY'
      ? 'bg-green-50 text-green-700 border-green-200'
      : signal === 'SELL'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <span
      className={cn('inline-flex px-2 py-0.5 rounded text-xs font-semibold border', cls)}
      role="status"
      aria-label={`Signal: ${signal}`}
    >
      {signal}
    </span>
  );
});
