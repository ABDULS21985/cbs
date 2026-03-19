import { formatMoneyCompact } from '@/lib/formatters';
import type { ProvisionMovementRow } from '../../types/ecl';

interface Props {
  data: ProvisionMovementRow[];
}

function cellClass(v: number): string {
  if (v > 0) return 'text-green-600';
  if (v < 0) return 'text-red-600';
  return '';
}

function displayValue(v: number): string {
  if (v === 0) return '—';
  return formatMoneyCompact(Math.abs(v));
}

export function ProvisionMovementTable({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No provision movement data available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-medium">Movement</th>
            <th className="text-right py-2 px-3 font-medium">Stage 1</th>
            <th className="text-right py-2 px-3 font-medium">Stage 2</th>
            <th className="text-right py-2 px-3 font-medium">Stage 3</th>
            <th className="text-right py-2 px-3 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.label}
              className={
                row.isTotal
                  ? 'font-semibold bg-muted/50'
                  : 'border-b border-border/40'
              }
            >
              <td className="py-2 px-3">{row.label}</td>
              {[row.stage1, row.stage2, row.stage3, row.total].map((v, i) => (
                <td
                  key={i}
                  className={`text-right py-2 px-3 font-mono ${cellClass(v)}`}
                >
                  {displayValue(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
