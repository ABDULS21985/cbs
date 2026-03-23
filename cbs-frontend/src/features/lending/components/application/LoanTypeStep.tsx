import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CreditCard,
  Home,
  Landmark,
  Loader2,
  ShoppingBag,
} from 'lucide-react';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';
import type { LoanProduct } from '../../types/loan';
import { useLoanProducts } from '../../hooks/useLoanData';

interface Props {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getProductIcon(product: LoanProduct) {
  const code = `${product.productType} ${product.productCode}`.toUpperCase();
  if (code.includes('MORTGAGE')) return Home;
  if (code.includes('OVERDRAFT')) return CreditCard;
  if (code.includes('POS')) return ShoppingBag;
  if (code.includes('SME') && code.includes('ASSET')) return Building2;
  if (code.includes('SME') || code.includes('BUSINESS')) return Briefcase;
  return Landmark;
}

export function LoanTypeStep({ state, updateField, onNext }: Props) {
  const { data: products = [], isLoading, isError } = useLoanProducts({ size: 100 });

  const selectProduct = (product: LoanProduct) => {
    const nextTenor = clamp(
      state.tenorMonths || product.minTenorMonths,
      product.minTenorMonths,
      product.maxTenorMonths,
    );
    const fallbackRate = product.defaultInterestRate ?? product.interestRateMin;
    const nextRate = clamp(
      state.interestRate || fallbackRate,
      product.interestRateMin,
      product.interestRateMax,
    );

    updateField('product', product);
    updateField('productCode', product.productCode);
    updateField('tenorMonths', nextTenor);
    updateField('interestRate', nextRate);
    updateField('schedulePreview', []);
    updateField('totalInterest', 0);
    updateField('totalRepayment', 0);
    onNext();
  };

  if (isLoading) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading loan products...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        Loan products could not be loaded from the backend.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Select Loan Product</h3>
      <p className="text-sm text-muted-foreground mb-4">Available products are loaded from the live product catalog.</p>
      {products.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          No active loan products are available.
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const Icon = getProductIcon(product);
          const selected = state.productCode === product.productCode;
          return (
            <button
              key={product.productCode}
              onClick={() => selectProduct(product)}
              className={cn(
                'flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all hover:shadow-md',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-base">{product.productName}</h4>
              <p className="text-xs text-muted-foreground mt-1">{product.description || 'No product description provided.'}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted">
                  {formatMoney(product.minAmount, product.currency)} - {formatMoney(product.maxAmount, product.currency)}
                </span>
                <span className="px-2 py-0.5 rounded bg-muted">
                  {product.interestRateMin.toFixed(2)}% - {product.interestRateMax.toFixed(2)}% p.a.
                </span>
                <span className="px-2 py-0.5 rounded bg-muted">
                  {product.minTenorMonths} - {product.maxTenorMonths} months
                </span>
                {product.requiresCollateral ? (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">Collateral required</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
