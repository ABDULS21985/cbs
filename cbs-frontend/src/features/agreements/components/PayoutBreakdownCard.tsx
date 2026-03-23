import { ArrowDown, Minus, Equal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { CommissionPayout } from '../../admin/types/commission';

interface PayoutBreakdownCardProps {
  payout: CommissionPayout;
  compact?: boolean;
}

function LineItem({
  label,
  amount,
  currency,
  color,
  bold,
  large,
  prefix,
}: {
  label: string;
  amount: number;
  currency: string;
  color?: 'gray' | 'blue' | 'red' | 'amber' | 'green';
  bold?: boolean;
  large?: boolean;
  prefix?: string;
}) {
  const colorCls = {
    gray: 'text-muted-foreground',
    blue: 'text-blue-700 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    green: 'text-green-700 dark:text-green-400',
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={cn('text-sm', color ? colorCls[color] : 'text-foreground')}>
        {prefix && <span className="mr-1 font-mono text-xs">{prefix}</span>}
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums font-mono',
          large ? 'text-lg' : 'text-sm',
          bold && 'font-bold',
          color ? colorCls[color] : 'text-foreground',
        )}
      >
        {prefix === '×' ? formatPercent(amount) : formatMoney(amount, currency)}
      </span>
    </div>
  );
}

export function PayoutBreakdownCard({ payout, compact }: PayoutBreakdownCardProps) {
  const cur = payout.currency || 'NGN';

  if (compact) {
    return (
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gross Sales</span>
          <span className="tabular-nums font-mono">{formatMoney(payout.grossSales, cur)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Rate</span>
          <span className="tabular-nums font-mono">{formatPercent(payout.commissionRateApplied)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span className="text-muted-foreground">Net</span>
          <span className={cn('tabular-nums font-mono font-bold', payout.netCommission > 0 ? 'text-green-700' : 'text-red-600')}>
            {formatMoney(payout.netCommission, cur)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-5 space-y-1">
      <LineItem label="Gross Sales" amount={payout.grossSales} currency={cur} color="gray" />

      <div className="flex items-center gap-2 py-0.5">
        <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Qualifying portion</span>
      </div>

      <LineItem label="Qualifying Sales" amount={payout.qualifyingSales} currency={cur} color="blue" />
      <LineItem label="Rate Applied" amount={payout.commissionRateApplied} currency={cur} prefix="×" />

      <div className="border-t my-2" />
      <LineItem label="Gross Commission" amount={payout.grossCommission} currency={cur} bold />

      {payout.deductions > 0 && (
        <LineItem label="Deductions" amount={payout.deductions} currency={cur} color="red" prefix="−" />
      )}
      {payout.clawbackAmount > 0 && (
        <LineItem label="Clawback" amount={payout.clawbackAmount} currency={cur} color="red" prefix="−" />
      )}
      <LineItem label="Tax (10%)" amount={payout.taxAmount} currency={cur} color="amber" prefix="−" />

      <div className="border-t my-2" />
      <LineItem
        label="Net Commission"
        amount={payout.netCommission}
        currency={cur}
        color={payout.netCommission > 0 ? 'green' : 'red'}
        bold
        large
      />

      <div className="flex items-center justify-between pt-3 mt-3 border-t">
        <StatusBadge status={payout.status} />
        {payout.paymentReference && (
          <span className="text-xs text-muted-foreground font-mono">{payout.paymentReference}</span>
        )}
      </div>
    </div>
  );
}
