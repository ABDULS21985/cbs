import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { TopDepositor } from '../../api/depositAnalyticsApi';

interface DepositConcentrationTableProps {
  depositors: TopDepositor[];
  isLoading?: boolean;
}

const SEGMENT_STYLES: Record<string, string> = {
  RETAIL: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  SME: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  CORPORATE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  GOVERNMENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

export function DepositConcentrationTable({ depositors, isLoading }: DepositConcentrationTableProps) {
  const flagged = depositors.filter((d) => d.riskFlag);
  const flaggedTotalPct = flagged.reduce((s, d) => s + d.pct, 0);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Concentration risk warning */}
      {flagged.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-700 dark:text-red-400">
            <span className="font-bold">Funding Concentration Risk:</span>{' '}
            {flagged.length} depositor{flagged.length > 1 ? 's' : ''} represent{' '}
            <span className="font-bold">{flaggedTotalPct.toFixed(1)}%</span> of total deposits
            — exceeding the 5% single-depositor threshold.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium w-8">#</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Segment</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Amount</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">% of Total</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium w-12">Risk</th>
            </tr>
          </thead>
          <tbody>
            {depositors.map((d) => (
              <tr
                key={d.rank}
                className={cn(
                  'border-b border-border/50 transition-colors',
                  d.riskFlag
                    ? 'bg-red-50/60 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20'
                    : 'hover:bg-muted/30',
                )}
              >
                <td className="py-2 px-2 text-muted-foreground tabular-nums">{d.rank}</td>
                <td className="py-2 px-2 font-medium text-foreground max-w-[200px] truncate">
                  <span title={d.name}>{d.name}</span>
                </td>
                <td className="py-2 px-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase', SEGMENT_STYLES[d.segment] ?? 'bg-muted text-muted-foreground')}>
                    {d.segment}
                  </span>
                </td>
                <td className="py-2 px-2 text-right font-semibold tabular-nums text-foreground">
                  {formatMoneyCompact(d.amount)}
                </td>
                <td className="py-2 px-2 text-right tabular-nums">
                  <span className={cn('font-semibold', d.riskFlag ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                    {d.pct.toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-muted-foreground">{d.type}</td>
                <td className="py-2 px-2 text-center">
                  {d.riskFlag && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline-block" aria-label="Concentration risk: >5% of total" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
