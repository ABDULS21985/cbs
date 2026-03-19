import { MoneyInput } from '@/components/shared';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface Props {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

const PURPOSES = ['Business Expansion', 'Working Capital', 'Asset Purchase', 'Education', 'Medical', 'Home Improvement', 'Debt Consolidation', 'Personal', 'Other'];
const REPAYMENT_METHODS = [
  { value: 'EQUAL_INSTALLMENT', label: 'Equal Installment (Annuity)' },
  { value: 'REDUCING_BALANCE', label: 'Reducing Balance' },
  { value: 'FLAT_RATE', label: 'Flat Rate' },
  { value: 'BALLOON', label: 'Balloon Payment' },
];

export function LoanDetailsStep({ state, updateField, onNext, onBack }: Props) {
  const canProceed = state.amount > 0 && state.purpose && state.tenorMonths > 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-semibold">Loan Details</h3>

      <MoneyInput label="Requested Amount" value={state.amount} onChange={(v) => updateField('amount', v)} currency="NGN" />

      <div>
        <label className="block text-sm font-medium mb-1.5">Purpose</label>
        <select value={state.purpose} onChange={(e) => updateField('purpose', e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Select purpose</option>
          {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Tenor (months): {state.tenorMonths}</label>
        <input type="range" min={1} max={360} value={state.tenorMonths} onChange={(e) => updateField('tenorMonths', parseInt(e.target.value))} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 month</span><span>360 months</span></div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Interest Rate (% p.a.)</label>
        <input type="number" step="0.01" value={state.interestRate || ''} onChange={(e) => updateField('interestRate', parseFloat(e.target.value) || 0)} placeholder="18.00" className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Repayment Method</label>
        <div className="grid grid-cols-2 gap-2">
          {REPAYMENT_METHODS.map((m) => (
            <button key={m.value} onClick={() => updateField('repaymentMethod', m.value)} className={`px-3 py-2 rounded-lg border text-sm text-left ${state.repaymentMethod === m.value ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} disabled={!canProceed} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
}
