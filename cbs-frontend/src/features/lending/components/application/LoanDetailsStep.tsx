import { MoneyInput } from '@/components/shared';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

interface Props {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

const REPAYMENT_METHODS = [
  { value: 'EQUAL_INSTALLMENT', label: 'Equal Installment (Annuity)' },
  { value: 'REDUCING_BALANCE', label: 'Reducing Balance' },
  { value: 'FLAT_RATE', label: 'Flat Rate' },
  { value: 'BALLOON', label: 'Balloon Payment' },
];

export function LoanDetailsStep({ state, updateField, onNext, onBack }: Props) {
  const product = state.product;
  const minAmount = product?.minAmount;
  const maxAmount = product?.maxAmount;
  const minTenor = product?.minTenorMonths ?? 1;
  const maxTenor = product?.maxTenorMonths ?? 360;
  const minRate = product?.interestRateMin;
  const maxRate = product?.interestRateMax;
  const canProceed = state.amount > 0 && state.purpose && state.tenorMonths > 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-semibold">Loan Details</h3>

      <MoneyInput
        label="Requested Amount"
        value={state.amount}
        onChange={(v) => updateField('amount', v)}
        currency={product?.currency ?? 'NGN'}
        min={minAmount}
        max={maxAmount}
      />
      {product ? (
        <p className="text-xs text-muted-foreground">
          Product range: {product.currency ?? 'NGN'} {product.minAmount.toLocaleString('en-NG')} to {product.maxAmount.toLocaleString('en-NG')}
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-medium mb-1.5">Purpose</label>
        <textarea
          value={state.purpose}
          onChange={(e) => updateField('purpose', e.target.value)}
          rows={3}
          placeholder="Describe the business or customer purpose for this facility"
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Tenor (months): {state.tenorMonths}</label>
        <input type="range" min={minTenor} max={maxTenor} value={state.tenorMonths} onChange={(e) => updateField('tenorMonths', parseInt(e.target.value, 10))} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{minTenor} month{minTenor === 1 ? '' : 's'}</span><span>{maxTenor} months</span></div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Interest Rate (% p.a.)</label>
        <input
          type="number"
          step="0.01"
          min={minRate}
          max={maxRate}
          value={state.interestRate || ''}
          onChange={(e) => updateField('interestRate', parseFloat(e.target.value) || 0)}
          placeholder={product?.defaultInterestRate?.toFixed(2) ?? '0.00'}
          className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {product ? (
          <p className="text-xs text-muted-foreground mt-1">
            Product rate band: {product.interestRateMin.toFixed(2)}% to {product.interestRateMax.toFixed(2)}%
          </p>
        ) : null}
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
