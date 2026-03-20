import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { fixedDepositApi, type FixedDeposit } from '../api/fixedDepositApi';

interface FdTopUpFormProps {
  fd: FixedDeposit;
  onClose: () => void;
}

export function FdTopUpForm({ fd, onClose }: FdTopUpFormProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(0);

  // Calculate projected interest with new principal
  const newPrincipal = fd.principalAmount + amount;
  const { data: projection } = useQuery({
    queryKey: ['fd-calc', newPrincipal, fd.interestRate, fd.tenor],
    queryFn: () => fixedDepositApi.calculateInterest({ principal: newPrincipal, rate: fd.interestRate, tenor: fd.tenor }),
    enabled: amount > 0,
    staleTime: 10_000,
  });

  // Top-up is conceptually a new deposit or amendment — use the calculate endpoint for preview
  // The actual top-up would need a backend endpoint; for now, we show the projection
  const topUpMut = useMutation({
    mutationFn: () => fixedDepositApi.calculateInterest({ principal: newPrincipal, rate: fd.interestRate, tenor: fd.tenor }),
    onSuccess: () => {
      toast.success('Top-up calculation complete — contact operations to process');
      qc.invalidateQueries({ queryKey: ['fixed-deposits'] });
      onClose();
    },
    onError: () => toast.error('Failed to process top-up'),
  });

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Top Up Fixed Deposit</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Principal</span><span className="font-mono font-medium">{formatMoney(fd.principalAmount, fd.currency)}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">FD Number</span><span className="font-mono text-xs">{fd.fdNumber}</span></div>
          </div>

          <MoneyInput label="Top-Up Amount" value={amount} onChange={setAmount} currency={fd.currency as 'NGN' | 'USD' | 'EUR' | 'GBP'} min={1000} />

          {amount > 0 && projection && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Calculator className="w-3 h-3" /> Projected After Top-Up</div>
              <div className="flex justify-between"><span className="text-muted-foreground">New Principal</span><span className="font-mono font-bold">{formatMoney(newPrincipal, fd.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gross Interest</span><span className="font-mono text-green-600">{formatMoney(projection.grossInterest, fd.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Net Interest</span><span className="font-mono">{formatMoney(projection.netInterest, fd.currency)}</span></div>
              <div className="flex justify-between font-medium border-t pt-2"><span>Maturity Value</span><span className="font-mono font-bold">{formatMoney(projection.maturityValue, fd.currency)}</span></div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={() => topUpMut.mutate()} disabled={amount <= 0 || topUpMut.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {topUpMut.isPending ? 'Processing...' : 'Process Top-Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
