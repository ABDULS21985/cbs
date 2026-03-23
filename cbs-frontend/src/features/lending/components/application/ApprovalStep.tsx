import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface ApprovalStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? <Check className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
      <span className={cn('text-sm', !passed && 'text-amber-600')}>{label}</span>
    </div>
  );
}

export function ApprovalStep({ state, onNext, onBack }: ApprovalStepProps) {
  const hasCollateral = state.collateralItems.length > 0 || !state.product?.requiresCollateral;
  const hasSchedule = state.schedulePreview.length > 0;
  const hasLoanDetails = !!state.productCode && state.amount > 0 && state.tenorMonths > 0 && !!state.purpose;
  const hasCustomer = !!state.customerId;

  const checklist = [
    { label: 'Borrower selected', passed: hasCustomer },
    { label: 'Loan details completed', passed: hasLoanDetails },
    { label: `Collateral captured${!state.product?.requiresCollateral ? ' (not required)' : ''}`, passed: hasCollateral },
    { label: 'Server schedule preview generated', passed: hasSchedule },
  ];

  const allPassed = checklist.every((item) => item.passed);

  return (
    <div className="surface-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Readiness Review</h3>
        <p className="text-sm text-muted-foreground">
          Confirm the application packet is complete before final submission.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-semibold mb-2">Submission Checklist</p>
        {checklist.map((item) => <CheckItem key={item.label} {...item} />)}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          Credit scoring, approval routing, and final decisioning are executed by backend workflow after submission.
        </p>
        <p className="text-xs text-blue-800 mt-2">
          Attached documents selected in this application: {state.documents.length}
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} disabled={!allPassed} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          Continue to Review
        </button>
      </div>
    </div>
  );
}
