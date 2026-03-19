import { AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import type { FeePreview } from '../../api/paymentApi';

interface Props {
  fromAccount: string;
  fromAccountName: string;
  toAccount: string;
  toAccountName: string;
  toBankName?: string;
  amount: number;
  currency: string;
  narration: string;
  fees?: FeePreview;
  scheduleDate?: string;
  requiresApproval: boolean;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function TransferReview({
  fromAccount, fromAccountName, toAccount, toAccountName, toBankName,
  amount, currency, narration, fees, scheduleDate, requiresApproval,
  onConfirm, onBack, isSubmitting,
}: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Transfer Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">From</span>
            <div className="text-right">
              <span className="font-mono">{fromAccount}</span>
              <p className="text-xs text-muted-foreground">{fromAccountName}</p>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To</span>
            <div className="text-right">
              <span className="font-mono">{toAccount}</span>
              <p className="text-xs text-muted-foreground">{toAccountName}{toBankName ? ` · ${toBankName}` : ''}</p>
            </div>
          </div>
          <hr />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-mono font-semibold">{formatMoney(amount, currency)}</span>
          </div>
          {fees && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fee + VAT</span>
                <span className="font-mono">{formatMoney(fees.transferFee + fees.vat, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Debit</span>
                <span className="font-mono">{formatMoney(fees.totalDebit, currency)}</span>
              </div>
            </>
          )}
          <hr />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Narration</span>
            <span>{narration || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{scheduleDate || 'Immediate'}</span>
          </div>
        </div>

        {requiresApproval && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Maker-Checker Required</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">This transfer requires supervisor approval.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="flex-1 px-4 py-2.5 border rounded-md text-sm hover:bg-muted">
            &larr; Back to Edit
          </button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {isSubmitting ? 'Processing...' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
