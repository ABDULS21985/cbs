import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DpdMatrixRow {
  product: string;
  current: { count: number; amount: number };
  dpd1_30: { count: number; amount: number };
  dpd31_60: { count: number; amount: number };
  dpd61_90: { count: number; amount: number };
  dpd91_180: { count: number; amount: number };
  dpd180plus: { count: number; amount: number };
}

interface DpdHeatmapMatrixProps {
  data: DpdMatrixRow[];
  onCellClick?: (product: string, bucket: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKETS = [
  { key: 'current', label: 'Current' },
  { key: 'dpd1_30', label: '1-30' },
  { key: 'dpd31_60', label: '31-60' },
  { key: 'dpd61_90', label: '61-90' },
  { key: 'dpd91_180', label: '91-180' },
  { key: 'dpd180plus', label: '180+' },
] as const;

type BucketKey = (typeof BUCKETS)[number]['key'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMaxAmount(data: DpdMatrixRow[]): number {
  let max = 0;
  for (const row of data) {
    for (const bucket of BUCKETS) {
      const val = row[bucket.key as BucketKey];
      if (val.amount > max) max = val.amount;
    }
  }
  return max || 1;
}

function getCellBgColor(amount: number, maxAmount: number, bucketKey: string): string {
  if (bucketKey === 'current') {
    // Current loans use green scale
    const intensity = Math.min(amount / maxAmount, 1);
    const alpha = Math.round(intensity * 40 + 5);
    return `rgba(22, 163, 74, ${alpha / 100})`;
  }
  // Delinquent buckets use red scale
  const intensity = Math.min(amount / maxAmount, 1);
  const alpha = Math.round(intensity * 60 + 5);
  return `rgba(220, 38, 38, ${alpha / 100})`;
}

function computeTotalRow(data: DpdMatrixRow[]): Record<BucketKey, { count: number; amount: number }> {
  const totals = {} as Record<BucketKey, { count: number; amount: number }>;
  for (const bucket of BUCKETS) {
    totals[bucket.key] = { count: 0, amount: 0 };
  }
  for (const row of data) {
    for (const bucket of BUCKETS) {
      totals[bucket.key].count += row[bucket.key].count;
      totals[bucket.key].amount += row[bucket.key].amount;
    }
  }
  return totals;
}

function computeRowTotal(row: DpdMatrixRow): { count: number; amount: number } {
  let count = 0;
  let amount = 0;
  for (const bucket of BUCKETS) {
    count += row[bucket.key].count;
    amount += row[bucket.key].amount;
  }
  return { count, amount };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DpdHeatmapMatrix({ data, onCellClick }: DpdHeatmapMatrixProps) {
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">DPD Heatmap Matrix</h2>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No DPD data available
        </div>
      </div>
    );
  }

  const maxAmount = getMaxAmount(data);
  const columnTotals = computeTotalRow(data);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">DPD Heatmap Matrix</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Days past due distribution by product. Click any cell for details.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" aria-label="DPD heatmap matrix">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-muted-foreground pb-2 pr-3 min-w-[120px]">Product</th>
              {BUCKETS.map((b) => (
                <th key={b.key} className="text-center font-medium text-muted-foreground pb-2 px-1 min-w-[80px]">
                  {b.label}
                </th>
              ))}
              <th className="text-center font-medium text-muted-foreground pb-2 pl-3 min-w-[80px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const rowTotal = computeRowTotal(row);
              return (
                <tr key={row.product} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 font-medium text-foreground whitespace-nowrap">
                    {row.product}
                  </td>
                  {BUCKETS.map((bucket) => {
                    const cell = row[bucket.key];
                    return (
                      <td
                        key={bucket.key}
                        className={cn(
                          'py-1.5 px-1 text-center transition-transform',
                          onCellClick && 'cursor-pointer hover:scale-105',
                        )}
                        onClick={() => onCellClick?.(row.product, bucket.label)}
                        role={onCellClick ? 'button' : undefined}
                        aria-label={onCellClick ? `${row.product} ${bucket.label}: ${cell.count} loans, ${formatMoneyCompact(cell.amount)}` : undefined}
                        tabIndex={onCellClick ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (onCellClick && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onCellClick(row.product, bucket.label);
                          }
                        }}
                      >
                        <div
                          className="rounded px-2 py-1.5 min-w-[70px]"
                          style={{ backgroundColor: getCellBgColor(cell.amount, maxAmount, bucket.key) }}
                        >
                          <div className="font-semibold text-foreground">{cell.count.toLocaleString()}</div>
                          <div className="text-muted-foreground text-[10px]">{formatMoneyCompact(cell.amount)}</div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 pl-3 text-center">
                    <div className="rounded px-2 py-1.5 bg-muted/40">
                      <div className="font-semibold text-foreground">{rowTotal.count.toLocaleString()}</div>
                      <div className="text-muted-foreground text-[10px]">{formatMoneyCompact(rowTotal.amount)}</div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2 pr-3 text-foreground">Total</td>
              {BUCKETS.map((bucket) => {
                const cell = columnTotals[bucket.key];
                return (
                  <td key={bucket.key} className="py-2 px-1 text-center">
                    <div className="rounded px-2 py-1.5 bg-muted/60">
                      <div className="font-bold text-foreground">{cell.count.toLocaleString()}</div>
                      <div className="text-muted-foreground text-[10px]">{formatMoneyCompact(cell.amount)}</div>
                    </div>
                  </td>
                );
              })}
              <td className="py-2 pl-3 text-center">
                <div className="rounded px-2 py-1.5 bg-primary/10">
                  <div className="font-bold text-foreground">
                    {Object.values(columnTotals)
                      .reduce((s, c) => s + c.count, 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    {formatMoneyCompact(Object.values(columnTotals).reduce((s, c) => s + c.amount, 0))}
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
        <span className="font-medium">Intensity:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }} />
          Low
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(220, 38, 38, 0.25)' }} />
          Medium
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(220, 38, 38, 0.55)' }} />
          High
        </span>
      </div>
    </div>
  );
}
