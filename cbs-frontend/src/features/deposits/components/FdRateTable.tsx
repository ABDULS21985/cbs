import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/formatters';
import type { RateTable } from '../api/fixedDepositApi';

interface FdRateTableProps {
  rates: RateTable[];
  selectedTenor?: number;
  onSelect: (rate: RateTable) => void;
}

export function FdRateTable({ rates, selectedTenor, onSelect }: FdRateTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tenor</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Standard Rate</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Premium Rate</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((row) => {
            const isSelected = selectedTenor === row.tenor;
            return (
              <tr
                key={row.tenor}
                onClick={() => onSelect(row)}
                className={cn(
                  'border-b last:border-0 cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-primary/10 hover:bg-primary/15'
                    : 'hover:bg-muted/40',
                )}
              >
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                    {!isSelected && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                    {row.tenorLabel}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={cn(isSelected && 'font-semibold text-primary')}>
                    {formatPercent(row.standardRate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={cn(isSelected && 'font-semibold text-primary')}>
                    {formatPercent(row.premiumRate)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rates.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No rate tables available.
        </div>
      )}
    </div>
  );
}
