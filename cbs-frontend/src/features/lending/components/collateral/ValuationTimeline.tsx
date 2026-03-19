import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ValuationHistoryItem } from '../../types/collateral';

interface ValuationTimelineProps {
  data: ValuationHistoryItem[];
  currency?: string;
  isLoading?: boolean;
}

export function ValuationTimeline({ data, currency = 'NGN', isLoading }: ValuationTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-24 h-4 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="w-24 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No valuation history available.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline vertical line */}
      <div className="absolute left-[88px] top-0 bottom-0 w-px bg-border ml-px" />

      <div className="space-y-0">
        {data.map((item, idx) => {
          const change = item.changeFromPrevious;
          const isUp = change !== undefined && change > 0;
          const isDown = change !== undefined && change < 0;
          const ChangeIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

          return (
            <div key={item.id} className="relative flex items-start gap-4 py-4">
              {/* Date on the left */}
              <div className="w-20 flex-shrink-0 text-right">
                <p className="text-xs text-muted-foreground leading-tight">
                  {formatDate(item.date)}
                </p>
              </div>

              {/* Timeline dot */}
              <div
                className={cn(
                  'relative z-10 mt-1 w-3 h-3 rounded-full border-2 flex-shrink-0',
                  idx === 0
                    ? 'bg-primary border-primary'
                    : 'bg-background border-muted-foreground/40'
                )}
              />

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <p className="text-sm font-medium">{item.valuer}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Method: {item.method}
                </p>
              </div>

              {/* Value on the right */}
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-mono font-semibold">
                  {formatMoney(item.value, currency)}
                </p>
                {change !== undefined && (
                  <div
                    className={cn(
                      'flex items-center justify-end gap-1 text-xs mt-0.5',
                      isUp ? 'text-green-600' : isDown ? 'text-red-500' : 'text-muted-foreground'
                    )}
                  >
                    <ChangeIcon className="w-3 h-3" />
                    <span>
                      {change > 0 ? '+' : ''}
                      {formatMoney(change, currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
