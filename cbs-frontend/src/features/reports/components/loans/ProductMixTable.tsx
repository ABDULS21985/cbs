import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { ProductMix } from '../../api/loanAnalyticsApi';

interface ProductMixTableProps {
  products: ProductMix[];
}

function getNplBadgeColor(pct: number): string {
  if (pct < 3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (pct <= 5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

export function ProductMixTable({ products }: ProductMixTableProps) {
  const total = products.reduce((s, p) => s + p.amount, 0);
  const totalCount = products.reduce((s, p) => s + p.count, 0);
  const weightedNpl = products.reduce((s, p) => s + p.nplPct * (p.amount / total), 0);
  const weightedRate = products.reduce((s, p) => s + p.avgRate * (p.amount / total), 0);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Product Mix Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Key metrics by loan product</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3">Product</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Count</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Amount</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">NPL%</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Avg Rate</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 pl-3">Avg Tenor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {products.map((product) => (
              <tr key={product.product} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: product.color }}
                    />
                    <span className="text-xs font-medium text-foreground">{product.product}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">
                  {product.count.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right text-xs font-medium text-foreground">
                  {formatMoneyCompact(product.amount)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold', getNplBadgeColor(product.nplPct))}>
                    {product.nplPct.toFixed(1)}%
                  </span>
                </td>
                <td className={cn('py-2.5 px-3 text-right text-xs font-medium', 'text-foreground')}>
                  {product.avgRate.toFixed(1)}%
                </td>
                <td className="py-2.5 pl-3 text-right text-xs text-muted-foreground">
                  {product.avgTenorMonths} mos
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="py-2.5 pr-3 text-xs font-semibold text-foreground">Weighted Avg / Total</td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-foreground">
                {totalCount.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-foreground">
                {formatMoneyCompact(total)}
              </td>
              <td className="py-2.5 px-3 text-right">
                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold', getNplBadgeColor(weightedNpl))}>
                  {weightedNpl.toFixed(1)}%
                </span>
              </td>
              <td className="py-2.5 px-3 text-right text-xs font-semibold text-foreground">
                {weightedRate.toFixed(1)}%
              </td>
              <td className="py-2.5 pl-3 text-right text-xs text-muted-foreground">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
