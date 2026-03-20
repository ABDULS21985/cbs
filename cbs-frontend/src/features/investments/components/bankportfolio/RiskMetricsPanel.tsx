import { formatMoney } from '@/lib/formatters';
import type { BankPortfolio } from '../../types/bankPortfolio';

export function RiskMetricsPanel({ portfolio }: { portfolio: BankPortfolio }) {
  const metrics = [
    { label: 'Modified Duration', value: portfolio.modifiedDuration?.toFixed(2) ?? '—' },
    { label: 'Convexity', value: portfolio.convexity?.toFixed(2) ?? '—' },
    { label: 'YTM', value: portfolio.yieldToMaturity ? `${portfolio.yieldToMaturity.toFixed(2)}%` : '—' },
    { label: 'VaR (99%, 1d)', value: portfolio.var991d ? formatMoney(portfolio.var991d, portfolio.currency) : '—' },
    { label: 'Credit Spread (bps)', value: portfolio.creditSpreadBps?.toString() ?? '—' },
    { label: 'Tracking Error (bps)', value: portfolio.trackingErrorBps?.toString() ?? '—' },
    { label: 'Asset Count', value: portfolio.assetCount?.toString() ?? '—' },
    { label: 'Benchmark', value: portfolio.benchmark ?? '—' },
  ];

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Risk Metrics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-sm font-medium font-mono mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
