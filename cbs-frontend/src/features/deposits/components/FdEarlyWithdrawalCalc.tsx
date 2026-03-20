import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { fixedDepositApi, type FixedDeposit } from '../api/fixedDepositApi';

interface FdEarlyWithdrawalCalcProps {
  fdId: string;
  fd: FixedDeposit;
}

export function FdEarlyWithdrawalCalc({ fdId, fd }: FdEarlyWithdrawalCalcProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: info, isLoading } = useQuery({
    queryKey: ['fixed-deposits', fdId, 'early-withdrawal'],
    queryFn: () => fixedDepositApi.getEarlyWithdrawal(fdId),
    enabled: fd.status === 'ACTIVE',
    staleTime: 60_000,
  });

  const { mutate: doLiquidate, isPending } = useMutation({
    mutationFn: () => fixedDepositApi.liquidate(fdId, 'Early withdrawal requested by customer'),
    onSuccess: () => {
      toast.success('Fixed deposit liquidated successfully');
      queryClient.invalidateQueries({ queryKey: ['fixed-deposits'] });
      setConfirmOpen(false);
    },
    onError: () => {
      toast.error('Failed to liquidate fixed deposit');
    },
  });

  if (fd.status !== 'ACTIVE') {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground text-center py-6">
        Early withdrawal is only available for active fixed deposits.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!info) return null;

  return (
    <>
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 p-4 space-y-3">
        <div className="flex items-start gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Early Withdrawal — {formatDate(info.breakDate)}</h4>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Early withdrawal incurs a penalty. The below shows your estimated proceeds if you break today.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-md border border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Principal</span>
            <span className="font-mono text-sm font-medium">{formatMoney(fd.principalAmount, fd.currency)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Accrued Interest (net)</span>
            <span className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
              +{formatMoney(info.accruedInterest, fd.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">
              Early Withdrawal Penalty ({formatPercent(info.penaltyRate)} p.a.)
            </span>
            <span className="font-mono text-sm font-medium text-red-600 dark:text-red-400">
              −{formatMoney(info.penaltyAmount, fd.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-b-md">
            <span className="text-sm font-semibold">Net Proceeds</span>
            <span className="font-mono text-sm font-bold">{formatMoney(info.netProceeds, fd.currency)}</span>
          </div>
        </div>

        {/* Keep vs Withdraw comparison */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-green-700 dark:text-green-400 font-medium mb-1">If You Keep</p>
            <p className="text-lg font-bold font-mono text-green-700 dark:text-green-400">{formatMoney(fd.maturityValue, fd.currency)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {Math.max(0, Math.ceil((new Date(fd.maturityDate).getTime() - Date.now()) / 86400000))} days remaining
            </p>
            <p className="text-[10px] text-muted-foreground">Interest: {formatMoney(fd.netInterest, fd.currency)}</p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-medium mb-1">If You Withdraw</p>
            <p className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">{formatMoney(info.netProceeds, fd.currency)}</p>
            <p className="text-[10px] text-red-600 mt-1">
              Penalty: −{formatMoney(info.penaltyAmount, fd.currency)}
            </p>
            <p className="text-[10px] text-red-600">Interest lost: {formatMoney(fd.netInterest - info.accruedInterest, fd.currency)}</p>
          </div>
        </div>

        {/* Interest comparison bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Interest earned</span>
            <span>Interest forfeited</span>
          </div>
          <div className="h-3 rounded-full bg-red-200 dark:bg-red-900/30 overflow-hidden">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${fd.netInterest > 0 ? (info.accruedInterest / fd.netInterest) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Proceed with Early Withdrawal
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => doLiquidate()}
        title="Confirm Early Withdrawal"
        description={`You are about to liquidate FD ${fd.fdNumber} early. A penalty of ${formatMoney(info.penaltyAmount, fd.currency)} will be applied. Net proceeds of ${formatMoney(info.netProceeds, fd.currency)} will be credited to the source account. This action cannot be undone.`}
        confirmLabel="Yes, Liquidate Now"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isPending}
      />
    </>
  );
}
