import { MoneyInput } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface Props {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function FinancialAssessmentStep({ state, updateField, onNext, onBack }: Props) {
  const dti = state.debtToIncomeRatio;
  const dtiColor = dti <= 40 ? 'text-green-600' : dti <= 60 ? 'text-amber-600' : 'text-red-600';
  const dtiLabel = dti <= 40 ? 'Healthy' : dti <= 60 ? 'Elevated' : 'High Risk';
  const dtiBg = dti <= 40 ? 'bg-green-500' : dti <= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-semibold">Financial Assessment</h3>

      <MoneyInput label="Monthly Income" value={state.monthlyIncome} onChange={(v) => updateField('monthlyIncome', v)} currency="NGN" />
      <MoneyInput label="Monthly Expenses" value={state.monthlyExpenses} onChange={(v) => updateField('monthlyExpenses', v)} currency="NGN" />
      <MoneyInput label="Existing Loan Obligations (monthly)" value={state.existingObligations} onChange={(v) => updateField('existingObligations', v)} currency="NGN" />

      {/* DTI Gauge */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Debt-to-Income Ratio</span>
          <span className={cn('text-2xl font-bold font-mono', dtiColor)}>{dti.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
          <div className={cn('h-full rounded-full transition-all duration-500', dtiBg)} style={{ width: `${Math.min(dti, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className={dtiColor}>{dtiLabel}</span>
          <span>100%</span>
        </div>
        <div className="flex gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> ≤40% Healthy</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 40-60% Elevated</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> &gt;60% High Risk</div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Continue</button>
      </div>
    </div>
  );
}
