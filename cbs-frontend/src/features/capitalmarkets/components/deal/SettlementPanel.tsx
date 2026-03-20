import { useState } from 'react';
import { toast } from 'sonner';
import { Check, PartyPopper } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import { useSettleDeal } from '../../hooks/useCapitalMarkets';
import type { CapitalMarketsDeal, Investor } from '../../api/capitalMarketsApi';

interface SettlementPanelProps {
  deal: CapitalMarketsDeal;
  investors: Investor[];
}

export function SettlementPanel({ deal, investors }: SettlementPanelProps) {
  const settleMut = useSettleDeal();
  const [confirmed, setConfirmed] = useState(false);

  const totalAllocated = investors.reduce((s, i) => s + (i.allocatedAmount ?? 0), 0);
  const feesPct = deal.targetAmount > 0 ? ((deal.feesEarned ?? 0) / deal.targetAmount) * 100 : 0;

  if (deal.status === 'SETTLED') {
    return (
      <div className="rounded-xl border bg-green-50 dark:bg-green-900/10 p-8 text-center space-y-3">
        <PartyPopper className="w-12 h-12 text-green-600 mx-auto" />
        <h3 className="text-xl font-bold text-green-700 dark:text-green-400">Deal Settled</h3>
        {deal.settlementDate && (
          <p className="text-sm text-muted-foreground">Settled on {formatDate(deal.settlementDate)}</p>
        )}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-4">
          <div>
            <div className="text-xs text-muted-foreground">Amount</div>
            <div className="font-mono font-bold">{formatMoney(totalAllocated || deal.targetAmount, deal.currency)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Investors</div>
            <div className="font-bold">{investors.filter((i) => i.allocationStatus === 'ALLOCATED').length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fees</div>
            <div className="font-mono font-bold text-green-700">{formatMoney(deal.feesEarned ?? 0, deal.currency)}</div>
          </div>
        </div>
      </div>
    );
  }

  const handleSettle = () => {
    settleMut.mutate(deal.code, {
      onSuccess: () => toast.success('Deal settled successfully'),
      onError: () => toast.error('Settlement failed'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Settlement summary */}
      <div className="rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold">Settlement Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="font-mono font-bold">{formatMoney(totalAllocated || deal.targetAmount, deal.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-medium">{deal.currency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Settlement Date</p>
            <p className="font-medium">{deal.allotmentDate ? formatDate(deal.allotmentDate) : 'T+2'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fees ({feesPct.toFixed(2)}%)</p>
            <p className="font-mono font-medium text-green-700">{formatMoney(deal.feesEarned ?? 0, deal.currency)}</p>
          </div>
        </div>
      </div>

      {/* Per-investor settlement */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Investor</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Allocated</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {investors.filter((i) => (i.allocatedAmount ?? 0) > 0).map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-2 font-medium">{inv.name}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">{formatMoney(inv.allocatedAmount ?? 0, deal.currency)}</td>
                <td className="px-4 py-2"><StatusBadge status={inv.allocationStatus ?? 'PENDING'} dot /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm & settle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="accent-primary" />
          I confirm all settlement details are correct
        </label>
        <button
          onClick={handleSettle}
          disabled={!confirmed || settleMut.isPending}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-4 h-4" />
          {settleMut.isPending ? 'Settling...' : 'Settle Deal'}
        </button>
      </div>
    </div>
  );
}
