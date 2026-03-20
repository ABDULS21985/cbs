import { AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';

interface PenaltyAlertBannerProps {
  overdueCount: number;
  penaltyAmount: number;
  installmentAmount: number;
  currency?: string;
  onPayOverdue?: () => void;
}

export function PenaltyAlertBanner({ overdueCount, penaltyAmount, installmentAmount, currency = 'NGN', onPayOverdue }: PenaltyAlertBannerProps) {
  if (overdueCount <= 0) return null;

  const totalDue = (overdueCount * installmentAmount) + penaltyAmount;

  return (
    <div className="flex items-start gap-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-600" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-red-700 dark:text-red-400">
          {overdueCount} overdue installment{overdueCount > 1 ? 's' : ''}
        </p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
          Penalty: <strong>{formatMoney(penaltyAmount, currency)}</strong>. Pay now to avoid further charges.
        </p>
      </div>
      {onPayOverdue && (
        <button onClick={onPayOverdue}
          className="flex-shrink-0 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
          Pay {formatMoney(totalDue, currency)}
        </button>
      )}
    </div>
  );
}
