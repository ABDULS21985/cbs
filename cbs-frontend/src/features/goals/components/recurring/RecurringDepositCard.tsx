import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import { PaymentProgressBar } from './PaymentProgressBar';
import type { RecurringDeposit } from '../../api/goalApi';

interface RecurringDepositCardProps {
  deposit: RecurringDeposit;
  onPayNow?: (id: number) => void;
}

export function RecurringDepositCard({ deposit, onPayNow }: RecurringDepositCardProps) {
  const navigate = useNavigate();
  const pct = deposit.totalInstallments > 0 ? Math.round((deposit.completedInstallments / deposit.totalInstallments) * 100) : 0;
  const hasOverdue = deposit.missedInstallments > 0;

  return (
    <div className={cn(
      'rounded-xl border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow cursor-pointer',
      hasOverdue && 'border-red-200 dark:border-red-800/40',
    )} onClick={() => navigate(`/accounts/recurring-deposits/${deposit.id}`)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{deposit.customer?.displayName ?? 'Customer'}</p>
          <p className="text-xs text-muted-foreground font-mono">{deposit.depositNumber ?? `RD-${deposit.id}`}</p>
        </div>
        <StatusBadge status={deposit.status} size="sm" dot />
      </div>

      <p className="text-sm text-muted-foreground">
        {formatMoney(deposit.installmentAmount)} / {deposit.frequency.toLowerCase().replace('_', '-')} · {deposit.totalInstallments} installments
      </p>

      <PaymentProgressBar paid={deposit.completedInstallments} total={deposit.totalInstallments} />

      <div className="flex items-center justify-between text-xs">
        <span className={cn('text-muted-foreground', hasOverdue && 'text-red-600 font-medium')}>
          Next due: {formatDate(deposit.nextDueDate)}
        </span>
        <span className="text-muted-foreground tabular-nums font-mono">
          {formatMoney(deposit.totalDeposited)} of {formatMoney(deposit.installmentAmount * deposit.totalInstallments)}
        </span>
      </div>

      {hasOverdue && deposit.totalPenalties > 0 && (
        <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 pt-1 border-t border-red-100 dark:border-red-900/30">
          <span>Penalties: {formatMoney(deposit.totalPenalties)}</span>
          <span>{deposit.missedInstallments} missed</span>
        </div>
      )}

      <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        {onPayNow && deposit.status === 'ACTIVE' && (
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
