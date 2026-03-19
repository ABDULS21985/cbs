import { cn } from '@/lib/utils';
import type { CostRecord } from '../../api/providerApi';

interface CostComparisonTableProps { records: CostRecord[]; }

export function CostComparisonTable({ records }: CostComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cost Model</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost/Call</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Month Vol.</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monthly Cost</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Est. Cost</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vol. Limit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map(r => {
            const overLimit = r.monthlyVolumeLimit > 0 && r.currentMonthVolume > r.monthlyVolumeLimit * 0.9;
            return (
              <tr key={r.providerCode} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{r.providerName}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.costModel}</td>
                <td className="px-4 py-3 text-right font-mono">{r.costPerCall != null ? `₦${Number(r.costPerCall).toFixed(2)}` : '—'}</td>
                <td className={cn('px-4 py-3 text-right font-mono', overLimit && 'text-amber-600 dark:text-amber-400')}>
                  {(r.currentMonthVolume ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono">₦{Number(r.monthlyCost ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">₦{Number(r.estimatedMonthlyCost ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{(r.monthlyVolumeLimit ?? 0).toLocaleString()}</td>
              </tr>
            );
          })}
          {records.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No cost data.</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
