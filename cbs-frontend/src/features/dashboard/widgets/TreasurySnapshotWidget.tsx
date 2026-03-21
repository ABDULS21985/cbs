import { useTreasuryMetrics } from '../hooks/useDashboardData';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

  // Use the most recent snapshot
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
      <p className="text-xs text-muted-foreground mb-2">
        Snapshot: {latest.snapshotDate} · {latest.currency}
      </p>
      <div className="divide-y">
        {metrics.map((m) => {
          const val = m.value ?? 0;
          return (
            <div key={m.label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <span className={cn('text-sm font-mono font-medium', val > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                {formatPercent(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
