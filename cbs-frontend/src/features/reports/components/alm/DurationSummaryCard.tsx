import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoneyDisplay } from '@/components/shared';
import { almReportApi } from '../../api/almReportApi';

interface DurationSummaryCardProps {
  asOfDate: string;
}

function MetricTile({ label, value, unit = 'yrs', warn }: { label: string; value: number; unit?: string; warn?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-3 flex flex-col gap-1', warn && 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10')}>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-end gap-1">
        <span className={cn('text-2xl font-bold tabular-nums', warn && 'text-amber-600 dark:text-amber-400')}>
          {value.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground mb-1">{unit}</span>
        {warn && <AlertTriangle className="w-4 h-4 text-amber-500 mb-0.5 ml-1" />}
      </div>
    </div>
  );
}

export function DurationSummaryCard({ asOfDate }: DurationSummaryCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['duration-analysis', asOfDate],
    queryFn: () => almReportApi.getDurationAnalysis(asOfDate),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const durationGapWarn = data.durationGap > 2;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Duration Analysis</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricTile label="Assets Duration" value={data.assetsDuration} />
          <MetricTile label="Liabilities Duration" value={data.liabilitiesDuration} />
          <MetricTile label="Equity Duration" value={data.equityDuration} />
          <MetricTile label="Duration Gap" value={data.durationGap} warn={durationGapWarn} />
        </div>

        <div className={cn(
          'rounded-lg border px-3 py-2.5 text-sm',
          data.equityValueChange1PctBps < 0
            ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
            : 'border-green-300 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300',
        )}>
          <span className="font-medium">Rate Sensitivity: </span>
          For every 1% increase in interest rates, equity value changes by approximately{' '}
          <span className="font-bold font-mono">
            <MoneyDisplay amount={data.equityValueChange1PctBps} compact colorCode showSign />
          </span>
        </div>

        {durationGapWarn && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Duration gap exceeds 2 years — elevated interest rate risk. Consider hedging or rebalancing the portfolio.</span>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Portfolio Breakdown</h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Duration (yrs)</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.portfolioBreakdown.map((row, idx) => (
                  <tr key={row.category} className={cn('border-b hover:bg-muted/20', idx % 2 === 1 && 'bg-muted/5')}>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.duration.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">
                      <MoneyDisplay amount={Math.abs(row.amount)} compact size="sm" colorCode={row.amount < 0} />
                      {row.amount < 0 && <span className="text-muted-foreground ml-1">(L)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
