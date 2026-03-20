import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VarianceLineItem {
  lineItem: string;
  current: number;
  priorPeriod: number;
  budget: number;
  varianceAmt: number;
  variancePct: number;
  subItems?: VarianceLineItem[];
}

interface VarianceTableProps {
  data: VarianceLineItem[];
  favorableDirection?: 'higher' | 'lower';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNFAVORABLE_THRESHOLD = 10;

function getVarianceColor(pct: number, favorableDirection: 'higher' | 'lower'): string {
  const isFavorable =
    favorableDirection === 'higher' ? pct >= 0 : pct <= 0;

  if (Math.abs(pct) <= UNFAVORABLE_THRESHOLD) {
    return 'text-foreground';
  }

  return isFavorable
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';
}

function getVarianceBg(pct: number, favorableDirection: 'higher' | 'lower'): string {
  const isFavorable =
    favorableDirection === 'higher' ? pct >= 0 : pct <= 0;

  if (Math.abs(pct) <= UNFAVORABLE_THRESHOLD) return '';

  return isFavorable
    ? 'bg-green-50/50 dark:bg-green-900/10'
    : 'bg-red-50/50 dark:bg-red-900/10';
}

// ─── Row Component ────────────────────────────────────────────────────────────

function VarianceRow({
  item,
  depth,
  favorableDirection,
}: {
  item: VarianceLineItem;
  depth: number;
  favorableDirection: 'higher' | 'lower';
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.subItems && item.subItems.length > 0;
  const varColor = getVarianceColor(item.variancePct, favorableDirection);
  const varBg = getVarianceBg(item.variancePct, favorableDirection);

  return (
    <>
      <tr
        className={cn(
          'border-b border-border/50 hover:bg-muted/30 transition-colors',
          varBg,
          hasChildren && 'cursor-pointer',
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
        role={hasChildren ? 'button' : undefined}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-label={hasChildren ? `Expand ${item.lineItem}` : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <td className="py-2.5 pr-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 16 }}>
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0',
                  expanded && 'rotate-90',
                )}
              />
            )}
            <span className={cn('text-xs', depth === 0 ? 'font-semibold text-foreground' : 'text-foreground')}>
              {item.lineItem}
            </span>
          </div>
        </td>
        <td className="py-2.5 px-2 text-right text-xs font-medium tabular-nums text-foreground">
          {formatMoneyCompact(item.current)}
        </td>
        <td className="py-2.5 px-2 text-right text-xs tabular-nums text-muted-foreground">
          {formatMoneyCompact(item.priorPeriod)}
        </td>
        <td className="py-2.5 px-2 text-right text-xs tabular-nums text-muted-foreground">
          {formatMoneyCompact(item.budget)}
        </td>
        <td className={cn('py-2.5 px-2 text-right text-xs font-medium tabular-nums', varColor)}>
          {item.varianceAmt >= 0 ? '+' : ''}
          {formatMoneyCompact(item.varianceAmt)}
        </td>
        <td className={cn('py-2.5 pl-2 text-right text-xs font-semibold tabular-nums', varColor)}>
          {item.variancePct >= 0 ? '+' : ''}
          {item.variancePct.toFixed(1)}%
        </td>
      </tr>
      {expanded &&
        item.subItems?.map((sub) => (
          <VarianceRow
            key={sub.lineItem}
            item={sub}
            depth={depth + 1}
            favorableDirection={favorableDirection}
          />
        ))}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VarianceTable({ data, favorableDirection = 'higher' }: VarianceTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Variance Analysis</h2>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No variance data available
        </div>
      </div>
    );
  }

  // Compute totals
  const totals = data.reduce(
    (acc, item) => ({
      current: acc.current + item.current,
      priorPeriod: acc.priorPeriod + item.priorPeriod,
      budget: acc.budget + item.budget,
      varianceAmt: acc.varianceAmt + item.varianceAmt,
    }),
    { current: 0, priorPeriod: 0, budget: 0, varianceAmt: 0 },
  );

  const totalVariancePct = totals.budget !== 0 ? (totals.varianceAmt / totals.budget) * 100 : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Variance Analysis</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Multi-period comparison with budget variance. Click rows with sub-items to expand.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Variance analysis table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-2">Line Item</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Current</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Prior Period</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Budget</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Variance (N)</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 pl-2">Variance (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <VarianceRow
                key={item.lineItem}
                item={item}
                depth={0}
                favorableDirection={favorableDirection}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-2.5 pr-2 text-xs text-foreground">Total</td>
              <td className="py-2.5 px-2 text-right text-xs tabular-nums text-foreground">
                {formatMoneyCompact(totals.current)}
              </td>
              <td className="py-2.5 px-2 text-right text-xs tabular-nums text-muted-foreground">
                {formatMoneyCompact(totals.priorPeriod)}
              </td>
              <td className="py-2.5 px-2 text-right text-xs tabular-nums text-muted-foreground">
                {formatMoneyCompact(totals.budget)}
              </td>
              <td
                className={cn(
                  'py-2.5 px-2 text-right text-xs tabular-nums',
                  getVarianceColor(totalVariancePct, favorableDirection),
                )}
              >
                {totals.varianceAmt >= 0 ? '+' : ''}
                {formatMoneyCompact(totals.varianceAmt)}
              </td>
              <td
                className={cn(
                  'py-2.5 pl-2 text-right text-xs tabular-nums',
                  getVarianceColor(totalVariancePct, favorableDirection),
                )}
              >
                {totalVariancePct >= 0 ? '+' : ''}
                {totalVariancePct.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
