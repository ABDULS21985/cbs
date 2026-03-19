import { cn } from '@/lib/utils';
import { Landmark, Briefcase, Building2, Home, CreditCard, ShoppingBag } from 'lucide-react';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';

const LOAN_TYPES = [
  { code: 'PERSONAL', name: 'Personal Loan', icon: Landmark, maxAmount: '₦10M', rate: '18-24%', maxTenor: '60 months', desc: 'Unsecured personal finance' },
  { code: 'SME_WC', name: 'SME Working Capital', icon: Briefcase, maxAmount: '₦50M', rate: '15-22%', maxTenor: '36 months', desc: 'Short-term business funding' },
  { code: 'SME_ASSET', name: 'SME Asset Finance', icon: Building2, maxAmount: '₦100M', rate: '14-20%', maxTenor: '60 months', desc: 'Equipment & machinery finance' },
  { code: 'MORTGAGE', name: 'Mortgage', icon: Home, maxAmount: '₦200M', rate: '12-18%', maxTenor: '300 months', desc: 'Residential & commercial property' },
  { code: 'OVERDRAFT', name: 'Overdraft', icon: CreditCard, maxAmount: '₦25M', rate: '20-28%', maxTenor: '12 months', desc: 'Revolving credit facility' },
  { code: 'POS_LOAN', name: 'POS / BNPL', icon: ShoppingBag, maxAmount: '₦5M', rate: '0-24%', maxTenor: '24 months', desc: 'Point-of-sale installment' },
];

interface Props {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
}

export function LoanTypeStep({ state, updateField, onNext }: Props) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Select Loan Product</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOAN_TYPES.map((type) => {
          const Icon = type.icon;
          const selected = state.productCode === type.code;
          return (
            <button
              key={type.code}
              onClick={() => {
                updateField('productCode', type.code);
                onNext();
              }}
              className={cn(
                'flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all hover:shadow-md',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base">{type.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted">Up to {type.maxAmount}</span>
                <span className="px-2 py-0.5 rounded bg-muted">{type.rate} p.a.</span>
                <span className="px-2 py-0.5 rounded bg-muted">{type.maxTenor}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
