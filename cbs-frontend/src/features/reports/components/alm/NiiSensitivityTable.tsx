import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoneyDisplay } from '@/components/shared';
import { almReportApi, type NiiScenario } from '../../api/almReportApi';
import { formatPercent } from '@/lib/formatters';

interface NiiSensitivityTableProps {
  asOfDate: string;
}

function formatBps(bps: number): string {
  if (bps === 0) return 'Base (0 bps)';
  return bps > 0 ? `+${bps} bps` : `${bps} bps`;
}

export function NiiSensitivityTable({ asOfDate }: NiiSensitivityTableProps) {
  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ['nii-sensitivity', asOfDate],
    queryFn: () => almReportApi.getNiiSensitivity(asOfDate),
  });

  const base = scenarios.find((s) => s.baseNii);

  if (isLoading) {
    return (
      <div className="surface-card p-4 space-y-2 animate-pulse">
        <div className="h-4 w-40 bg-muted rounded" />
        {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-9 bg-muted/50 rounded" />)}
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">NII Sensitivity by Rate Scenario</h3>
        {base && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Base NII: <MoneyDisplay amount={base.niiImpact} compact size="sm" />
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-muted-foreground text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left font-medium">Rate Change</th>
              <th className="px-4 py-2.5 text-right font-medium">NII Impact (₦)</th>
              <th className="px-4 py-2.5 text-right font-medium">NII Change %</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s: NiiScenario) => {
              const isBase = s.baseNii;
              const isPositive = s.niiChangePct > 0;
              const isNegative = s.niiChangePct < 0;

              return (
                <tr
                  key={s.rateChangeBps}
                  className={cn(
                    'border-b transition-colors',
                    isBase && 'bg-green-50 dark:bg-green-900/20 font-bold',
                    !isBase && 'hover:bg-muted/20',
                  )}
                >
                  <td className={cn('px-4 py-2.5', isBase && 'font-bold')}>
                    {formatBps(s.rateChangeBps)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <MoneyDisplay amount={s.niiImpact} compact size="sm" />
                  </td>
                  <td className={cn(
                    'px-4 py-2.5 text-right font-mono tabular-nums',
                    isBase && 'text-green-700 dark:text-green-300',
                    !isBase && isPositive && 'text-green-600 dark:text-green-400',
                    !isBase && isNegative && 'text-red-600 dark:text-red-400',
                  )}>
                    {isBase ? '—' : (isPositive ? '+' : '') + formatPercent(s.niiChangePct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t">
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Asset-Sensitive Balance Sheet</span>
            {' — '}
            The bank benefits from rising interest rates. Rate increases expand NII while rate cuts compress margins.
            Management should monitor the gap position and consider liability repricing strategies if a rate decline is anticipated.
          </div>
        </div>
      </div>
    </div>
  );
}
