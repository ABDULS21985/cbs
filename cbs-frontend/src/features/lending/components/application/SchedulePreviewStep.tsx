import { useEffect, useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';
import { useLoanSchedulePreview } from '../../hooks/useLoanData';

interface Props {
  state: LoanApplicationState;
  updateField?: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SchedulePreviewStep({ state, updateField, onNext, onBack }: Props) {
  const previewRequest = useMemo(() => {
    if (!state.customerId || !state.productCode || state.amount <= 0 || state.tenorMonths <= 0) {
      return null;
    }
    return {
      customerId: state.customerId,
      loanProductCode: state.productCode,
      requestedAmount: state.amount,
      requestedTenureMonths: state.tenorMonths,
      purpose: state.purpose || undefined,
      proposedRate: state.interestRate || undefined,
      repaymentScheduleType: state.repaymentMethod || undefined,
      repaymentFrequency: state.repaymentFrequency || undefined,
    };
  }, [
    state.amount,
    state.customerId,
    state.interestRate,
    state.productCode,
    state.purpose,
    state.repaymentFrequency,
    state.repaymentMethod,
    state.tenorMonths,
  ]);

  const {
    data: items = [],
    isLoading,
    isError,
    isFetching,
  } = useLoanSchedulePreview(previewRequest, true);

  const totalInterest = useMemo(
    () => items.reduce((sum, item) => sum + item.interestDue, 0),
    [items],
  );
  const totalRepayment = useMemo(
    () => items.reduce((sum, item) => sum + item.totalDue, 0),
    [items],
  );
  const displayItems = items.slice(0, 12); // Show first 12, indicate more

  useEffect(() => {
    if (!updateField) return;
    if (!previewRequest) {
      updateField('schedulePreview', []);
      updateField('totalInterest', 0);
      updateField('totalRepayment', 0);
      return;
    }
    if (items.length === 0) return;
    updateField('schedulePreview', items);
    updateField('totalInterest', totalInterest);
    updateField('totalRepayment', totalRepayment);
  }, [items, previewRequest, totalInterest, totalRepayment, updateField]);

  const canProceed = items.length > 0 && !isLoading && !isFetching;

  if (!previewRequest) {
    return (
      <div className="surface-card p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Repayment Schedule Preview</h3>
        <p className="text-sm text-muted-foreground">
          Complete the borrower, product, amount, tenor, and rate details before requesting a server-side schedule preview.
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Repayment Schedule Preview</h3>
      <p className="text-sm text-muted-foreground">Schedule figures are loaded from the backend preview endpoint.</p>

      {isLoading || isFetching ? (
        <div className="surface-card p-5 text-sm text-muted-foreground flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating schedule preview...
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          The schedule preview could not be generated from the backend.
        </div>
      ) : null}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Principal</div><div className="text-lg font-semibold font-mono mt-1">{formatMoney(state.amount)}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Total Interest</div><div className="text-lg font-semibold font-mono mt-1">{formatMoney(totalInterest)}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground">Total Repayment</div><div className="text-lg font-semibold font-mono mt-1 text-primary">{formatMoney(totalRepayment)}</div></div>
      </div>

      {/* Schedule table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="px-4 py-2.5 text-left">#</th>
              <th className="px-4 py-2.5 text-left">Due Date</th>
              <th className="px-4 py-2.5 text-right">Principal</th>
              <th className="px-4 py-2.5 text-right">Interest</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item) => (
              <tr key={item.installmentNumber}>
                <td className="px-4 text-sm">{item.installmentNumber}</td>
                <td className="px-4 text-sm">{formatDate(item.dueDate)}</td>
                <td className="px-4 text-sm font-mono text-right">{formatMoney(item.principalDue)}</td>
                <td className="px-4 text-sm font-mono text-right">{formatMoney(item.interestDue)}</td>
                <td className="px-4 text-sm font-mono text-right font-medium">{formatMoney(item.totalDue)}</td>
                <td className="px-4 text-sm font-mono text-right">{formatMoney(item.outstanding)}</td>
              </tr>
            ))}
            {items.length > 12 && (
              <tr><td colSpan={6} className="px-4 py-2 text-center text-sm text-muted-foreground">... and {items.length - 12} more installments</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} disabled={!canProceed} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
}
