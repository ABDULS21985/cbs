import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useAllotDeal } from '../../hooks/useCapitalMarkets';
import type { CapitalMarketsDeal, Investor } from '../../api/capitalMarketsApi';

interface AllotmentWorkflowProps {
  deal: CapitalMarketsDeal;
  investors: Investor[];
}

type AllotmentMethod = 'PRO_RATA' | 'PRIORITY' | 'DISCRETIONARY';

export function AllotmentWorkflow({ deal, investors }: AllotmentWorkflowProps) {
  const allotMut = useAllotDeal();
  const [method, setMethod] = useState<AllotmentMethod>('PRO_RATA');

  const totalBids = useMemo(() => investors.reduce((s, i) => s + i.bidAmount, 0), [investors]);

  // Preview allocation
  const preview = useMemo(() => {
    if (method === 'PRO_RATA') {
      const ratio = deal.targetAmount / Math.max(totalBids, 1);
      return investors.map((inv) => ({
        ...inv,
        proposed: Math.min(inv.bidAmount, inv.bidAmount * ratio),
        pct: deal.targetAmount > 0 ? (Math.min(inv.bidAmount, inv.bidAmount * ratio) / deal.targetAmount) * 100 : 0,
      }));
    }
    if (method === 'PRIORITY') {
      const sorted = [...investors].sort((a, b) => (b.bidPrice ?? 0) - (a.bidPrice ?? 0));
      let remaining = deal.targetAmount;
      return sorted.map((inv) => {
        const alloc = Math.min(inv.bidAmount, remaining);
        remaining = Math.max(0, remaining - alloc);
        return { ...inv, proposed: alloc, pct: deal.targetAmount > 0 ? (alloc / deal.targetAmount) * 100 : 0 };
      });
    }
    return investors.map((inv) => ({ ...inv, proposed: inv.bidAmount, pct: 0 }));
  }, [investors, method, deal.targetAmount, totalBids]);

  const totalProposed = preview.reduce((s, p) => s + p.proposed, 0);

  if (deal.totalAllocated != null && deal.totalAllocated > 0) {
    return (
      <div className="rounded-xl border bg-green-50 dark:bg-green-900/10 p-6 text-center space-y-2">
        <Check className="w-8 h-8 text-green-600 mx-auto" />
        <h3 className="font-semibold text-green-700 dark:text-green-400">Allotment Complete</h3>
        <p className="text-sm text-muted-foreground">
          {formatMoney(deal.totalAllocated, deal.currency)} allocated to {investors.filter((i) => i.allocationStatus === 'ALLOCATED').length} investors
        </p>
      </div>
    );
  }

  const handleExecute = () => {
    allotMut.mutate(deal.code, {
      onSuccess: () => toast.success('Allotment executed'),
      onError: () => toast.error('Failed to execute allotment'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Allotment Method:</label>
        {(['PRO_RATA', 'PRIORITY', 'DISCRETIONARY'] as AllotmentMethod[]).map((m) => (
          <button key={m} onClick={() => setMethod(m)} className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
            method === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}>
            {m.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Investor</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Bid Amount</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Proposed Allocation</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">% of Target</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {preview.map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-2 font-medium">{inv.name}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{formatMoney(inv.bidAmount, deal.currency)}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums font-medium">{formatMoney(inv.proposed, deal.currency)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{inv.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-muted/30 font-semibold">
            <tr>
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right font-mono">{formatMoney(totalBids, deal.currency)}</td>
              <td className="px-4 py-2 text-right font-mono">{formatMoney(totalProposed, deal.currency)}</td>
              <td className="px-4 py-2 text-right">
                {deal.targetAmount > 0 ? ((totalProposed / deal.targetAmount) * 100).toFixed(1) : 0}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {totalProposed > deal.targetAmount && (
        <p className="text-xs text-red-600">Total allocation exceeds target amount</p>
      )}

      <div className="flex justify-end">
        <button onClick={handleExecute} disabled={allotMut.isPending} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {allotMut.isPending ? 'Executing...' : 'Execute Allotment'}
        </button>
      </div>
    </div>
  );
}
