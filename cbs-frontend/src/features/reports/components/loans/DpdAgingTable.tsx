import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { DpdBucket } from '../../api/loanAnalyticsApi';

interface DpdAgingTableProps {
  buckets: DpdBucket[];
}

function getCoverageTextColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function DpdAgingTable({ buckets }: DpdAgingTableProps) {
  const totalCount = buckets.reduce((s, b) => s + b.count, 0);
  const totalAmount = buckets.reduce((s, b) => s + b.amount, 0);
  const totalProvision = buckets.reduce((s, b) => s + b.provision, 0);
  const totalCoverage = totalAmount > 0 ? (totalProvision / totalAmount) * 100 : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">DPD Aging Schedule</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Provision coverage by delinquency bucket</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4">Bucket</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Count</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Amount</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">% Portfolio</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Provision</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 pl-3">Coverage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {buckets.map((bucket) => (
              <tr key={bucket.bucket} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: bucket.color }}
                    />
                    <span className="font-medium text-foreground text-xs">{bucket.bucket}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                  {bucket.count.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right text-xs font-medium text-foreground">
                  {formatMoneyCompact(bucket.amount)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${bucket.portfolioPct}%`, backgroundColor: bucket.color }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-10 text-right">
                      {bucket.portfolioPct.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                  {formatMoneyCompact(bucket.provision)}
                </td>
                <td className={cn('py-2.5 pl-3 text-right text-xs font-semibold', getCoverageTextColor(bucket.coveragePct))}>
                  {bucket.coveragePct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="py-2.5 pr-4 text-xs font-semibold text-foreground">Total</td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-foreground">
                {totalCount.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-foreground">
                {formatMoneyCompact(totalAmount)}
              </td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-foreground">100.0%</td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-foreground">
                {formatMoneyCompact(totalProvision)}
              </td>
              <td className={cn('py-2.5 pl-3 text-right text-xs font-semibold', getCoverageTextColor(totalCoverage))}>
                {totalCoverage.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
