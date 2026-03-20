import { useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Check } from 'lucide-react';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { usePriceDeal } from '../../hooks/useCapitalMarkets';
import type { CapitalMarketsDeal, Investor, PricingInput } from '../../api/capitalMarketsApi';

interface PricingWorkflowProps {
  deal: CapitalMarketsDeal;
  investors: Investor[];
}

export function PricingWorkflow({ deal, investors }: PricingWorkflowProps) {
  const priceMut = usePriceDeal();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PricingInput>({
    finalPrice: 0,
    yieldRate: 0,
    allotmentDate: '',
  });

  const sortedByPrice = [...investors].sort((a, b) => (b.bidPrice ?? 0) - (a.bidPrice ?? 0));
  const totalBids = investors.reduce((s, i) => s + i.bidAmount, 0);

  // Recommended price: weighted average of bids
  const weightedAvgPrice = totalBids > 0
    ? investors.reduce((s, i) => s + (i.bidPrice ?? 0) * i.bidAmount, 0) / totalBids
    : 0;

  // At the selected price, which investors qualify
  const qualifyingInvestors = form.finalPrice > 0
    ? investors.filter((i) => (i.bidPrice ?? 0) >= form.finalPrice)
    : investors;
  const qualifyingTotal = qualifyingInvestors.reduce((s, i) => s + i.bidAmount, 0);
  const oversubscription = deal.targetAmount > 0 ? qualifyingTotal / deal.targetAmount : 0;

  const handleConfirm = () => {
    if (!form.finalPrice || !form.allotmentDate) {
      toast.error('Price and allotment date are required');
      return;
    }
    priceMut.mutate(
      { code: deal.code, input: form },
      {
        onSuccess: () => toast.success('Pricing executed successfully'),
        onError: () => toast.error('Failed to execute pricing'),
      },
    );
  };

  if (deal.finalPrice != null) {
    return (
      <div className="rounded-xl border bg-green-50 dark:bg-green-900/10 p-6 text-center space-y-2">
        <Check className="w-8 h-8 text-green-600 mx-auto" />
        <h3 className="font-semibold text-green-700 dark:text-green-400">Pricing Executed</h3>
        <p className="text-sm text-muted-foreground">
          Priced at {formatMoney(deal.finalPrice, deal.currency)} — {deal.yieldRate?.toFixed(2)}% yield — {deal.coverageRatio?.toFixed(2)}x coverage
        </p>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-6">
      {/* Step tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <button key={s} onClick={() => setStep(s)} className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
            step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}>
            Step {s}
          </button>
        ))}
      </div>

      {/* Step 1: Price Discovery */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Price Discovery</h3>
          <p className="text-xs text-muted-foreground">All bids sorted by price (descending). Cutoff at target amount highlighted.</p>
          <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Investor</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Bid Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Bid Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Cumulative</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  let cumulative = 0;
                  return sortedByPrice.map((inv) => {
                    cumulative += inv.bidAmount;
                    const pastTarget = cumulative > deal.targetAmount && (cumulative - inv.bidAmount) <= deal.targetAmount;
                    return (
                      <tr key={inv.id} className={pastTarget ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                        <td className="px-4 py-2 font-medium">{inv.name}</td>
                        <td className="px-4 py-2 text-right font-mono">{inv.bidPrice?.toFixed(2) ?? '—'}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatMoney(inv.bidAmount, deal.currency)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatMoney(cumulative, deal.currency)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          {weightedAvgPrice > 0 && (
            <p className="text-sm">Recommended price: <span className="font-mono font-bold">{weightedAvgPrice.toFixed(2)}</span></p>
          )}
          <button onClick={() => { setForm((f) => ({ ...f, finalPrice: Number(weightedAvgPrice.toFixed(2)) })); setStep(2); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Set Final Price
          </button>
        </div>
      )}

      {/* Step 2: Set Final Price */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Set Final Price</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MoneyInput label="Final Price" value={form.finalPrice} onChange={(v) => setForm((f) => ({ ...f, finalPrice: v }))} currency={deal.currency as 'NGN'} />
            <div>
              <label className="block text-sm font-medium mb-1">Yield Rate (%)</label>
              <input type="number" step="0.01" value={form.yieldRate || ''} onChange={(e) => setForm((f) => ({ ...f, yieldRate: Number(e.target.value) }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Allotment Date</label>
              <input type="date" value={form.allotmentDate} onChange={(e) => setForm((f) => ({ ...f, allotmentDate: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <button onClick={() => setStep(3)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Preview Impact</button>
        </div>
      )}

      {/* Step 3: Impact Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Impact Preview</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground">Qualifying Investors</div>
              <div className="text-lg font-bold">{qualifyingInvestors.length}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground">Qualifying Volume</div>
              <div className="text-lg font-bold font-mono">{formatMoney(qualifyingTotal, deal.currency)}</div>
            </div>
            <div className={cn('rounded-lg p-3 text-center', oversubscription >= 1 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
              <div className="text-xs text-muted-foreground">Oversubscription</div>
              <div className={cn('text-lg font-bold font-mono', oversubscription >= 1 ? 'text-green-700' : 'text-red-700')}>{(oversubscription * 100).toFixed(0)}%</div>
            </div>
          </div>
          <button onClick={() => setStep(4)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Confirm Pricing</button>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="rounded-xl border p-6 space-y-4 text-center">
          <BarChart3 className="w-8 h-8 text-primary mx-auto" />
          <h3 className="font-semibold">Confirm Pricing Execution</h3>
          <p className="text-sm text-muted-foreground">
            Price: <span className="font-mono font-bold">{form.finalPrice}</span> | Yield: <span className="font-mono font-bold">{form.yieldRate}%</span> | Date: <span className="font-mono font-bold">{form.allotmentDate}</span>
          </p>
          <button onClick={handleConfirm} disabled={priceMut.isPending} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50">
            {priceMut.isPending ? 'Executing...' : 'Execute Pricing'}
          </button>
        </div>
      )}
    </div>
  );
}
