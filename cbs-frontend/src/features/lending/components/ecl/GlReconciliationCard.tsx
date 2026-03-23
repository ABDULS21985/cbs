import { CheckCircle, XCircle } from 'lucide-react';
import { formatMoneyCompact } from '@/lib/formatters';
import type { GlReconciliation } from '../../types/ecl';

interface Props {
  data: GlReconciliation;
}

export function GlReconciliationCard({ data }: Props) {
  const { cbsEclTotal, glProvisionBalance, difference, reconciled } = data;

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">GL Reconciliation</h3>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            reconciled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {reconciled ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          {reconciled ? 'Reconciled' : 'Variance Detected'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">CBS ECL Total</p>
          <p className="text-base font-semibold tabular-nums">
            {formatMoneyCompact(cbsEclTotal)}
          </p>
        </div>

        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-1">GL Impairment Provision</p>
          <p className="text-base font-semibold tabular-nums">
            {formatMoneyCompact(glProvisionBalance)}
          </p>
        </div>

        <div
          className={`rounded-md p-3 ${
            reconciled
              ? 'bg-green-50 dark:bg-green-950/30'
              : 'bg-red-50 dark:bg-red-950/30'
          }`}
        >
          <p className="text-xs text-muted-foreground mb-1">Difference</p>
          <p
            className={`text-base font-semibold tabular-nums ${
              reconciled
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {difference === 0 ? '₦0' : formatMoneyCompact(Math.abs(difference))}
          </p>
          {!reconciled && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {difference > 0 ? 'CBS exceeds GL' : 'GL exceeds CBS'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
