import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoneyDisplay } from '@/components/shared';
import { almReportApi, type FxPosition } from '../../api/almReportApi';
import { formatPercent } from '@/lib/formatters';

interface FxExposureTableProps {
  asOfDate: string;
}

function UtilizationBar({ pct }: { pct: number }) {
  const abs = Math.abs(pct);
  const color =
    abs < 50 ? 'bg-green-500' :
    abs < 80 ? 'bg-amber-500' :
    'bg-red-500';
  const trackColor =
    abs < 50 ? 'bg-green-100 dark:bg-green-900/20' :
    abs < 80 ? 'bg-amber-100 dark:bg-amber-900/20' :
    'bg-red-100 dark:bg-red-900/20';

  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-2 w-20 rounded-full overflow-hidden', trackColor)}>
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(abs, 100)}%` }} />
      </div>
      <span className={cn(
        'text-xs font-mono tabular-nums',
        abs < 50 ? 'text-green-700 dark:text-green-400' :
        abs < 80 ? 'text-amber-700 dark:text-amber-400' :
        'text-red-700 dark:text-red-400',
      )}>
        {formatPercent(abs, 0)}
      </span>
      {abs >= 80 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
    </div>
  );
}

export function FxExposureTable({ asOfDate }: FxExposureTableProps) {
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['fx-exposure', asOfDate],
    queryFn: () => almReportApi.getFxExposure(asOfDate),
  });

  const totals = positions.reduce(
    (acc, p) => ({
      assets: acc.assets + p.assets,
      liabilities: acc.liabilities + p.liabilities,
      netOpenPosition: acc.netOpenPosition + p.netOpenPosition,
      nopLimit: acc.nopLimit + p.nopLimit,
      realizedPnl: acc.realizedPnl + p.realizedPnl,
      unrealizedPnl: acc.unrealizedPnl + p.unrealizedPnl,
    }),
    { assets: 0, liabilities: 0, netOpenPosition: 0, nopLimit: 0, realizedPnl: 0, unrealizedPnl: 0 },
  );

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">FX Net Open Positions</h3>
        <p className="text-xs text-muted-foreground mt-0.5">All amounts in NGN equivalent</p>
      </div>
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="animate-pulse p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-medium">Currency</th>
                <th className="px-4 py-2.5 text-right font-medium">Assets</th>
                <th className="px-4 py-2.5 text-right font-medium">Liabilities</th>
                <th className="px-4 py-2.5 text-right font-medium">Net Open Position</th>
                <th className="px-4 py-2.5 text-right font-medium">NOP Limit</th>
                <th className="px-4 py-2.5 text-center font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p: FxPosition, idx) => (
                <tr key={p.currency} className={cn('border-b hover:bg-muted/20 transition-colors', idx % 2 === 1 && 'bg-muted/5')}>
                  <td className="px-4 py-2.5 font-semibold">{p.currency}</td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyDisplay amount={p.assets} compact size="sm" />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyDisplay amount={p.liabilities} compact size="sm" />
                  </td>
                  <td className={cn(
                    'px-4 py-2.5 text-right font-mono tabular-nums text-sm font-medium',
                    p.netOpenPosition > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                  )}>
                    {p.netOpenPosition >= 0 ? '+' : ''}{(p.netOpenPosition / 1e9).toFixed(1)}B
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyDisplay amount={p.nopLimit} compact size="sm" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-center">
                      <UtilizationBar pct={p.utilizationPct} />
                    </div>
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
                <td className={cn(
                  'px-4 py-2.5 text-right font-mono tabular-nums text-sm',
                  totals.netOpenPosition >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                )}>
                  {totals.netOpenPosition >= 0 ? '+' : ''}{(totals.netOpenPosition / 1e9).toFixed(1)}B
                </td>
                <td className="px-4 py-2.5 text-right">
                  <MoneyDisplay amount={totals.nopLimit} compact size="sm" />
                </td>
                <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">—</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
