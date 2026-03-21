import { useTreasuryMetrics } from '../hooks/useDashboardData';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MetricRow {
  label: string;
  value: number | undefined;
  format: 'percent' | 'ratio';
  goodDirection?: 'up' | 'down';
}

export function TreasurySnapshotWidget() {
  const { data: snapshots = [], isLoading } = useTreasuryMetrics('NGN');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const latest = snapshots[0];
  if (!latest) {
    return <p className="text-sm text-muted-foreground text-center py-8">No treasury data available</p>;
  }

  const metrics: MetricRow[] = [
    { label: 'Net Interest Margin', value: latest.netInterestMarginPct, format: 'percent', goodDirection: 'up' },
    { label: 'Capital Adequacy Ratio', value: latest.capitalAdequacyRatio, format: 'percent', goodDirection: 'up' },
    { label: 'Return on Assets', value: latest.returnOnAssetsPct, format: 'percent', goodDirection: 'up' },
    { label: 'Return on Equity', value: latest.returnOnEquityPct, format: 'percent', goodDirection: 'up' },
    { label: 'Loan-to-Deposit Ratio', value: latest.loanToDepositRatio, format: 'percent' },
    { label: 'Cost of Funds', value: latest.costOfFundsPct, format: 'percent', goodDirection: 'down' },
    { label: 'Tier 1 Ratio', value: latest.tier1Ratio, format: 'percent', goodDirection: 'up' },
    { label: 'Interest Spread', value: latest.interestSpreadPct, format: 'percent', goodDirection: 'up' },
  ];

  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/50 mb-3">
        <span className="text-xs text-muted-foreground font-medium">
          {latest.snapshotDate} · {latest.currency}
        </span>
      </div>
      <div className="space-y-0">
        {metrics.map((m, i) => {
          const val = m.value ?? 0;
          const isGood = m.goodDirection === 'up' ? val > 5 : m.goodDirection === 'down' ? val < 5 : null;
          return (
            <div key={m.label} className={cn('flex items-center justify-between py-2 px-2 rounded-lg', i % 2 === 0 && 'bg-muted/30')}>
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <div className="flex items-center gap-1.5">
                <span className={cn('text-sm font-mono font-semibold', val > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                  {formatPercent(val)}
                </span>
                {isGood !== null && (
                  isGood
                    ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                    : <TrendingDown className="w-3 h-3 text-red-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
