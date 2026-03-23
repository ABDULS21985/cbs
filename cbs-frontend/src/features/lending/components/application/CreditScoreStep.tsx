import { Shield } from 'lucide-react';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface CreditScoreStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CreditScoreStep({ state, onNext, onBack }: CreditScoreStepProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Credit Assessment</h3>
        <p className="text-sm text-muted-foreground">
          Credit scoring is executed by the backend after the application is submitted.
        </p>
      </div>

      <div className="rounded-lg border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Server-side scoring only</p>
            <p className="text-xs text-muted-foreground">
              The frontend no longer fabricates a preview score or decision for this step.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{state.customerName || 'Not selected'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Product</p>
            <p className="font-medium">{state.product?.productName || state.productCode || 'Not selected'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Requested Amount</p>
            <p className="font-medium">{state.amount > 0 ? state.amount.toLocaleString('en-NG') : 'Not entered'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          The submitted application will be routed through the lending decision engine, which will return the
          actual credit score, risk grade, and recommendation.
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Continue</button>
      </div>
    </div>
  );
}
