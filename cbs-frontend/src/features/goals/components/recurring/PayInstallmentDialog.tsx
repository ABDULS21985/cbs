import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { recurringDepositApi, type RDInstallment } from '../../api/goalApi';
import { goalQueryKeys } from '../../hooks/useGoals';

interface PayInstallmentDialogProps {
  depositId: number;
  installments: RDInstallment[];
  currency?: string;
  onClose: () => void;
}

export function PayInstallmentDialog({ depositId, installments, currency = 'NGN', onClose }: PayInstallmentDialogProps) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const payable = installments.filter((i) => i.status === 'PENDING' || i.status === 'MISSED')
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  // Auto-select overdue
  useState(() => {
    const overdueNums = new Set(payable.filter((i) => i.overdue || i.status === 'MISSED').map((i) => i.installmentNumber));
    if (overdueNums.size > 0) setSelected(overdueNums);
    // Also select next upcoming if no overdue
    if (overdueNums.size === 0 && payable.length > 0) setSelected(new Set([payable[0].installmentNumber]));
  });

  const selectedInstallments = payable.filter((i) => selected.has(i.installmentNumber));
  const totalAmount = selectedInstallments.reduce((s, i) => s + i.amountDue, 0);
  const totalPenalty = selectedInstallments.reduce((s, i) => s + (i.penaltyAmount ?? 0), 0);
  const grandTotal = totalAmount + totalPenalty;

  const payMut = useMutation({
    mutationFn: async () => {
      for (const inst of selectedInstallments) {
        await recurringDepositApi.payInstallment(depositId, inst.installmentNumber);
      }
    },
    onSuccess: () => {
      toast.success(`${selectedInstallments.length} installment(s) paid`);
      // Use canonical goal query keys so React Query cache entries are correctly invalidated
      qc.invalidateQueries({ queryKey: goalQueryKeys.recurringDeposits });
      qc.invalidateQueries({ queryKey: goalQueryKeys.recurringDeposit(String(depositId)) });
      onClose();
    },
    onError: () => toast.error('Payment failed'),
  });

  const toggle = (num: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Pay Installment</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-muted-foreground">Select installments to pay:</p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {payable.slice(0, 6).map((inst) => (
              <label key={inst.installmentNumber}
                className={cn('flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  selected.has(inst.installmentNumber) ? 'border-primary bg-primary/5' : 'hover:bg-muted/30',
                  inst.overdue && 'border-red-200 dark:border-red-800/40',
                )}>
                <input type="checkbox" checked={selected.has(inst.installmentNumber)} onChange={() => toggle(inst.installmentNumber)} className="accent-primary" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">#{inst.installmentNumber}</span>
                    <span className="font-mono tabular-nums">{formatMoney(inst.amountDue, currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{inst.dueDate}</span>
                    {inst.penaltyAmount > 0 && <span className="text-red-600">+{formatMoney(inst.penaltyAmount, currency)} penalty</span>}
                  </div>
                </div>
                {inst.overdue && <span className="text-[10px] font-bold text-red-600">OVERDUE</span>}
              </label>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-lg border p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Installments</span><span className="font-mono">{formatMoney(totalAmount, currency)}</span></div>
            {totalPenalty > 0 && <div className="flex justify-between"><span className="text-red-600">Penalty</span><span className="font-mono text-red-600">{formatMoney(totalPenalty, currency)}</span></div>}
            <div className="flex justify-between font-bold border-t pt-1.5"><span>Total</span><span className="font-mono">{formatMoney(grandTotal, currency)}</span></div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={() => payMut.mutate()} disabled={selected.size === 0 || payMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              <Check className="w-4 h-4" /> {payMut.isPending ? 'Paying...' : `Pay ${formatMoney(grandTotal, currency)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
