import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MoneyDisplay } from '@/components/shared';
import { almReportApi, type GapBucket } from '../../api/almReportApi';

interface MaturityGapTableProps {
  asOfDate: string;
  onAsOfDateChange: (date: string) => void;
}

export function MaturityGapTable({ asOfDate, onAsOfDateChange }: MaturityGapTableProps) {
  const { data: buckets = [], isLoading } = useQuery({
    queryKey: ['gap-analysis', asOfDate],
    queryFn: () => almReportApi.getGapAnalysis(asOfDate),
  });

  const totals = buckets.reduce(
    (acc, b) => ({ assets: acc.assets + b.assets, liabilities: acc.liabilities + b.liabilities, gap: acc.gap + b.gap }),
    { assets: 0, liabilities: 0, gap: 0 },
  );

  function gapClass(value: number) {
    if (value > 0) return 'text-green-600 dark:text-green-400 font-medium';
    if (value < 0) return 'text-red-600 dark:text-red-400 font-medium';
    return '';
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Maturity Gap Analysis</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="gap-asofdate" className="text-xs text-muted-foreground">As of:</label>
          <input
            id="gap-asofdate"
            type="date"
            value={asOfDate}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => onAsOfDateChange(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="animate-pulse p-4 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-medium">Maturity Bucket</th>
                <th className="px-4 py-2.5 text-right font-medium">Assets</th>
                <th className="px-4 py-2.5 text-right font-medium">Liabilities</th>
                <th className="px-4 py-2.5 text-right font-medium">Gap</th>
                <th className="px-4 py-2.5 text-right font-medium">Cumulative Gap</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((row: GapBucket, idx) => (
                <tr key={row.bucket} className={cn('border-b hover:bg-muted/20 transition-colors', idx % 2 === 1 && 'bg-muted/5')}>
                  <td className="px-4 py-2.5 font-medium">{row.bucket}</td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyDisplay amount={row.assets} compact size="sm" />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyDisplay amount={row.liabilities} compact size="sm" />
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-mono tabular-nums text-sm', gapClass(row.gap))}>
                    {row.gap >= 0 ? '+' : ''}{(row.gap / 1e9).toFixed(1)}B
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-mono tabular-nums text-sm', gapClass(row.cumulativeGap))}>
                    {row.cumulativeGap >= 0 ? '+' : ''}{(row.cumulativeGap / 1e9).toFixed(1)}B
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right">
                  <MoneyDisplay amount={totals.assets} compact size="sm" />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <MoneyDisplay amount={totals.liabilities} compact size="sm" />
                </td>
                <td className={cn('px-4 py-2.5 text-right font-mono tabular-nums text-sm', gapClass(totals.gap))}>
                  {totals.gap >= 0 ? '+' : ''}{(totals.gap / 1e9).toFixed(1)}B
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">—</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
