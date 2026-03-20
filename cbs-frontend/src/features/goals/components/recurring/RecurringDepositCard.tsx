import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import { PaymentProgressBar } from './PaymentProgressBar';
import type { RecurringDeposit } from '../../api/goalApi';

interface RecurringDepositCardProps {
  deposit: RecurringDeposit;
  onPayNow?: (id: string) => void;
}

export function RecurringDepositCard({ deposit, onPayNow }: RecurringDepositCardProps) {
  const navigate = useNavigate();
  const pct = deposit.totalInstallments > 0 ? Math.round((deposit.installmentsPaid / deposit.totalInstallments) * 100) : 0;
  const totalPaid = deposit.installmentsPaid * deposit.amount;
  const totalExpected = deposit.totalInstallments * deposit.amount;
  const hasOverdue = deposit.status === 'MISSED';

  return (
    <div className={cn(
      'rounded-xl border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow cursor-pointer',
      hasOverdue && 'border-red-200 dark:border-red-800/40',
    )} onClick={() => navigate(`/accounts/recurring-deposits/${deposit.id}`)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{deposit.customerName}</p>
          <p className="text-xs text-muted-foreground font-mono">{deposit.id}</p>
        </div>
        <StatusBadge status={deposit.status} size="sm" dot />
      </div>

      <p className="text-sm text-muted-foreground">
        {formatMoney(deposit.amount)} / {deposit.frequency.toLowerCase()} · {deposit.totalInstallments} installments
      </p>

      <PaymentProgressBar paid={deposit.installmentsPaid} total={deposit.totalInstallments} />

      <div className="flex items-center justify-between text-xs">
        <span className={cn('text-muted-foreground', hasOverdue && 'text-red-600 font-medium')}>
          Next due: {formatDate(deposit.nextDueDate)}
        </span>
        <span className="text-muted-foreground tabular-nums font-mono">
          {formatMoney(totalPaid)} of {formatMoney(totalExpected)}
        </span>
      </div>

      {hasOverdue && deposit.penalty != null && deposit.penalty > 0 && (
        <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 pt-1 border-t border-red-100 dark:border-red-900/30">
          <span>Penalty: {formatMoney(deposit.penalty)}</span>
        </div>
      )}

      <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        {onPayNow && deposit.status !== 'COMPLETED' && (
          <button onClick={() => onPayNow(deposit.id)} className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
            Pay Now
          </button>
        )}
        <button onClick={() => navigate(`/accounts/recurring-deposits/${deposit.id}`)} className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
          View Details
        </button>
      </div>
    </div>
  );
}
