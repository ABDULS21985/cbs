import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import type { MarketPrice } from '../types';

interface PriceCardProps {
  price: MarketPrice;
}

/** Displays the current price snapshot for a single instrument. */
export const PriceCard = React.memo(function PriceCard({ price }: PriceCardProps) {
  const changePct = price.changePct ?? 0;
  const isUp = changePct > 0;
  const isDown = changePct < 0;

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-mono">{price.instrumentCode}</div>
          {price.instrumentName && (
            <div className="font-semibold text-lg">{price.instrumentName}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isUp ? (
            <TrendingUp className="w-5 h-5 text-green-600" aria-hidden="true" />
          ) : isDown ? (
            <TrendingDown className="w-5 h-5 text-red-600" aria-hidden="true" />
          ) : (
            <Minus className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          )}
          <span
            className={cn(
              'text-sm font-semibold',
              isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            {changePct > 0 ? '+' : ''}
            {changePct.toFixed(2)}%
          </span>
          {/* Screen-reader-only description of price change */}
          <span className="sr-only">
            Price {isUp ? 'up' : isDown ? 'down' : 'unchanged'} {Math.abs(changePct).toFixed(2)} percent
          </span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Bid', value: price.bid },
          { label: 'Ask', value: price.ask },
          { label: 'Last', value: price.last },
          { label: 'Volume', value: price.volume },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="font-mono font-semibold text-sm">{value.toLocaleString()}</div>
          </div>
        ))}
      </div>
      {price.source && (
        <div className="text-xs text-muted-foreground">
          Source: {price.source} &middot; {formatDateTime(price.recordedAt)}
        </div>
      )}
    </div>
  );
});
