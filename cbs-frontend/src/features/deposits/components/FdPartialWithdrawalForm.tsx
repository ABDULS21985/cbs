import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { fixedDepositApi, type FixedDeposit } from '../api/fixedDepositApi';

const REASONS = ['EMERGENCY', 'FINANCIAL_NEED', 'BETTER_OPPORTUNITY', 'OTHER'];

interface FdPartialWithdrawalFormProps {
  fd: FixedDeposit;
  onClose: () => void;
}

export function FdPartialWithdrawalForm({ fd, onClose }: FdPartialWithdrawalFormProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [reasonText, setReasonText] = useState('');
  const minFdAmount = 10000; // Minimum FD balance
  const maxWithdrawal = fd.principalAmount - minFdAmount;

  // Fetch early withdrawal penalty info
  const { data: penaltyInfo } = useQuery({
    queryKey: ['fixed-deposits', fd.id, 'early-withdrawal'],
    queryFn: () => fixedDepositApi.getEarlyWithdrawal(fd.id),
    enabled: fd.status === 'ACTIVE',
    staleTime: 60_000,
  });

  // Estimate partial penalty proportionally
  const penaltyRate = penaltyInfo?.penaltyRate ?? 0;
  const estimatedPenalty = amount > 0 ? (amount * penaltyRate) / 100 : 0;
  const netProceeds = amount - estimatedPenalty;
  const remainingPrincipal = fd.principalAmount - amount;

  const partialMut = useMutation({
    mutationFn: () => fixedDepositApi.partialLiquidate(fd.id, amount, reason === 'OTHER' ? reasonText : reason),
    onSuccess: () => {
      toast.success('Partial withdrawal processed');
      qc.invalidateQueries({ queryKey: ['fixed-deposits'] });
      onClose();
    },
    onError: () => toast.error('Failed to process partial withdrawal'),
  });

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Partial Withdrawal</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">Partial withdrawal incurs a penalty of {formatPercent(penaltyRate)} on the withdrawn amount.</p>
          </div>

          <MoneyInput label="Withdrawal Amount" value={amount} onChange={setAmount} currency={fd.currency as 'NGN' | 'USD' | 'EUR' | 'GBP'}
            min={1000} max={maxWithdrawal > 0 ? maxWithdrawal : undefined} />
          <p className="text-xs text-muted-foreground -mt-2">Maximum: {formatMoney(maxWithdrawal, fd.currency)} (min FD balance: {formatMoney(minFdAmount, fd.currency)})</p>

          {amount > 0 && (
            <div className="rounded-lg border p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Withdrawal</span><span className="font-mono">{formatMoney(amount, fd.currency)}</span></div>
              <div className="flex justify-between"><span className="text-red-600">Penalty ({formatPercent(penaltyRate)})</span><span className="font-mono text-red-600">−{formatMoney(estimatedPenalty, fd.currency)}</span></div>
              <div className="flex justify-between font-medium border-t pt-1.5"><span>Net Proceeds</span><span className="font-mono">{formatMoney(netProceeds, fd.currency)}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Remaining Principal</span><span className="font-mono">{formatMoney(remainingPrincipal, fd.currency)}</span></div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Reason <span className="text-red-500">*</span></label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
              <option value="">Select reason...</option>
              {REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {reason === 'OTHER' && (
            <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="Please specify..." rows={2} className={inputCls + ' resize-none'} />
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={() => partialMut.mutate()} disabled={amount <= 0 || amount > maxWithdrawal || !reason || partialMut.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {partialMut.isPending ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
