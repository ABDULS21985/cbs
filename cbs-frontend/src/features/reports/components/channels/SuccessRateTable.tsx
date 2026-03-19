import { cn } from '@/lib/utils';
import type { ChannelSuccessRate } from '../../api/channelAnalyticsApi';

interface SuccessRateTableProps {
  rates: ChannelSuccessRate[];
  isLoading?: boolean;
}

function successColor(pct: number): string {
  if (pct >= 99.5) return 'text-green-600 dark:text-green-400';
  if (pct >= 99.0) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 98.0) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function successBarColor(pct: number): string {
  if (pct >= 99.5) return 'bg-green-500';
  if (pct >= 99.0) return 'bg-blue-500';
  if (pct >= 98.0) return 'bg-amber-500';
  return 'bg-red-500';
}

function latencyColor(ms: number): string {
  if (ms < 500)  return 'text-green-600 dark:text-green-400';
  if (ms < 1000) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SuccessRateTable({ rates, isLoading }: SuccessRateTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Channel Success Rates &amp; Latency</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sorted worst-to-best — channels requiring attention appear first
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-border bg-muted/30">
              {['Channel', 'Total', 'Success', 'Failed', 'Timeout', 'Success Rate', 'Avg Latency', 'P95 Latency'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rates.map((r, idx) => (
              <tr
                key={r.channel}
                className={cn(
                  'border-t border-border/50 hover:bg-muted/20 transition-colors',
                  idx === 0 && 'bg-red-50/30 dark:bg-red-950/10',
                )}
              >
                <td className="px-4 py-3 font-medium whitespace-nowrap">{r.label}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {r.total.toLocaleString()}
                </td>
                <td className="px-4 py-3 tabular-nums text-green-600 dark:text-green-400">
                  {r.success.toLocaleString()}
                </td>
                <td className="px-4 py-3 tabular-nums text-red-600 dark:text-red-400">
                  {r.failed.toLocaleString()}
                </td>
                <td className="px-4 py-3 tabular-nums text-amber-600 dark:text-amber-400">
                  {r.timeout.toLocaleString()}
                </td>
                <td className="px-4 py-3 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', successBarColor(r.successPct))}
                        style={{ width: `${Math.max(0, (r.successPct - 94) / 6) * 100}%` }}
                      />
                    </div>
                    <span className={cn('tabular-nums font-semibold text-xs w-12 text-right', successColor(r.successPct))}>
                      {r.successPct.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className={cn('px-4 py-3 tabular-nums font-medium', latencyColor(r.avgLatencyMs))}>
                  {formatMs(r.avgLatencyMs)}
                </td>
                <td className={cn('px-4 py-3 tabular-nums font-medium', latencyColor(r.p95LatencyMs))}>
                  {formatMs(r.p95LatencyMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
