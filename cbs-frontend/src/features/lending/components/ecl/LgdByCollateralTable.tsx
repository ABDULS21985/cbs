import { formatPercent } from '@/lib/formatters';
import type { LgdByCollateral } from '../../types/ecl';

interface Props {
  data: LgdByCollateral[];
}

function lgdBarColor(lgd: number): string {
  if (lgd < 30) return 'bg-green-500';
  if (lgd < 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function lgdTextColor(lgd: number): string {
  if (lgd < 30) return 'text-green-700 dark:text-green-400';
  if (lgd < 60) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

export function LgdByCollateralTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No LGD data available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium">Collateral Type</th>
            <th className="text-right py-2 px-3 font-medium">LGD %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.collateralType} className="border-b border-border/40">
              <td className="py-2 px-3">
                <div className="font-medium">{row.collateralType}</div>
                {row.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {row.description}
                  </div>
                )}
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-2 justify-end">
                  <div className="flex-1 max-w-[80px] bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${lgdBarColor(row.lgdPct)}`}
                      style={{ width: `${Math.min(row.lgdPct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium tabular-nums ${lgdTextColor(row.lgdPct)}`}>
                    {formatPercent(row.lgdPct, 1)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
