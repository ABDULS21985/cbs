import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { MaturityBucket } from '../../api/depositAnalyticsApi';

interface RolloverForecastProps {
  buckets: MaturityBucket[];
  isLoading?: boolean;
}

function getProgressColor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getTextColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function RolloverForecast({ buckets, isLoading }: RolloverForecastProps) {
  const totalMaturing = buckets.reduce((s, b) => s + b.amount, 0);
  const totalExpectedRollover = buckets.reduce((s, b) => s + b.amount * (b.rolloverPct / 100), 0);
  const totalGap = totalMaturing - totalExpectedRollover;
  const overallRolloverPct = totalMaturing > 0 ? (totalExpectedRollover / totalMaturing) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-md bg-muted/40 px-3 py-2">
          <div className="text-muted-foreground">Total Maturing</div>
          <div className="font-bold text-foreground text-sm mt-0.5">{formatMoneyCompact(totalMaturing)}</div>
        </div>
        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <div className="text-muted-foreground">Expected Rollover</div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
            {formatMoneyCompact(totalExpectedRollover)}
            <span className="text-xs font-normal text-muted-foreground ml-1">({overallRolloverPct.toFixed(1)}%)</span>
          </div>
        </div>
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
          <div className="text-muted-foreground">Funding Gap</div>
          <div className="font-bold text-red-600 dark:text-red-400 text-sm mt-0.5">{formatMoneyCompact(totalGap)}</div>
        </div>
      </div>

      {/* Rollover table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Month</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Maturing</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium w-36">Rollover %</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Exp. Rollover</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Gap</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => {
              const rolloverAmount = b.amount * (b.rolloverPct / 100);
              const gap = b.amount - rolloverAmount;
              return (
                <tr key={b.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2 font-medium text-foreground">{b.month}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-foreground">{formatMoneyCompact(b.amount)}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', getProgressColor(b.rolloverPct))}
                          style={{ width: `${b.rolloverPct}%` }}
                        />
                      </div>
                      <span className={cn('tabular-nums font-semibold w-10 text-right', getTextColor(b.rolloverPct))}>
                        {b.rolloverPct}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatMoneyCompact(rolloverAmount)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-red-600 dark:text-red-400 font-semibold">
                    ({formatMoneyCompact(gap)})
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="py-2 px-2 font-bold text-foreground">Total</td>
              <td className="py-2 px-2 text-right tabular-nums font-bold text-foreground">{formatMoneyCompact(totalMaturing)}</td>
              <td className="py-2 px-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', getProgressColor(overallRolloverPct))}
                      style={{ width: `${overallRolloverPct}%` }}
                    />
                  </div>
                  <span className={cn('tabular-nums font-bold w-10 text-right', getTextColor(overallRolloverPct))}>
                    {overallRolloverPct.toFixed(1)}%
                  </span>
                </div>
              </td>
              <td className="py-2 px-2 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoneyCompact(totalExpectedRollover)}
              </td>
              <td className="py-2 px-2 text-right tabular-nums font-bold text-red-600 dark:text-red-400">
                ({formatMoneyCompact(totalGap)})
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
