import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CostRecord } from '../../api/providerApi';

interface CostComparisonTableProps {
  records: CostRecord[];
}

const COST_MODEL_LABELS: Record<string, string> = {
  PER_CALL: 'Per Call',
  MONTHLY_FLAT: 'Monthly Flat',
  TIERED: 'Tiered',
  REVENUE_SHARE: 'Rev Share',
};

export function CostComparisonTable({ records }: CostComparisonTableProps) {
  // For each provider, show the most recent month's record
  const providerLatest = new Map<string, CostRecord>();
  [...records].sort((a, b) => b.month.localeCompare(a.month)).forEach(r => {
    if (!providerLatest.has(r.providerId)) providerLatest.set(r.providerId, r);
  });
  const rows = Array.from(providerLatest.values());

  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalVariance = rows.reduce((s, r) => s + r.variance, 0);

  // Cost optimization: flag providers > 30% above average per-call cost
  const avgCost = rows.length > 0 ? totalCost / rows.length : 0;
  const expensive = rows.filter(r => r.totalCost > avgCost * 1.3);

  return (
    <div>
      {expensive.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4 text-sm">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">Cost Optimization Note</p>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
              {expensive.map(r => r.providerName).join(', ')} {expensive.length === 1 ? 'is' : 'are'} more than 30% above the average provider cost
              (avg: ₦{avgCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}). Consider renegotiating contracts or exploring alternatives.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cost Model</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unit Cost (₦)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Volume</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Cost (₦)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Budget (₦)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Variance (₦)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(r => {
              const overBudget = r.variance > 0;
              const isExpensive = expensive.some(e => e.providerId === r.providerId);
              return (
                <tr
                  key={r.providerId}
                  className={cn(
                    'hover:bg-muted/40 transition-colors',
                    isExpensive && 'bg-amber-50/20 dark:bg-amber-900/5',
                  )}
                >
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    {r.providerName}
                    {isExpensive && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {COST_MODEL_LABELS[r.costModel] || r.costModel}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {r.costModel === 'MONTHLY_FLAT' ? '—' : `₦${r.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {r.volume.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ₦{r.totalCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    ₦{r.budget.toLocaleString()}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right font-semibold',
                    overBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                  )}>
                    {overBudget ? '+' : ''}₦{Math.abs(r.variance).toLocaleString()}
                  </td>
                </tr>
              );
            })}

            {/* Total row */}
            {rows.length > 0 && (
              <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                <td colSpan={4} className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">₦{totalCost.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">₦{totalBudget.toLocaleString()}</td>
                <td className={cn(
                  'px-4 py-3 text-right',
                  totalVariance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                )}>
                  {totalVariance > 0 ? '+' : ''}₦{Math.abs(totalVariance).toLocaleString()}
                </td>
              </tr>
            )}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No cost records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
