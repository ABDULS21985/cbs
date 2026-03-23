import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { Product } from '../../api/accountOpeningApi';

interface ProductCardProps {
  product: Product;
  selected: boolean;
  onClick: () => void;
}

export function ProductCard({ product, selected, onClick }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'opening-selection-card relative w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
        selected && 'opening-selection-card-active',
      )}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}

      {/* Sharia badge */}
      {product.isSharia && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs font-medium">
          <Star className="w-3 h-3 fill-current" />
          Sharia
        </div>
      )}

      {/* Product type badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-[0.16em]',
          product.type === 'SAVINGS' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          product.type === 'CURRENT' && 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
          product.type === 'DOMICILIARY' && 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
        )}>
          {product.type}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{product.code}</span>
      </div>

      {/* Name */}
      <h3 className={cn('text-base font-semibold mb-1', selected && 'text-primary')}>{product.name}</h3>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Interest Rate</p>
          <p className="text-sm font-semibold font-mono mt-0.5">
            {product.isSharia ? 'N/A' : formatPercent(product.interestRate)} p.a.
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Min. Balance</p>
          <p className="text-sm font-semibold font-mono mt-0.5">{formatMoney(product.minimumBalance, product.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Monthly Fee</p>
          <p className={cn('text-sm font-semibold font-mono mt-0.5', product.monthlyFee === 0 && 'text-green-600 dark:text-green-400')}>
            {product.monthlyFee === 0 ? 'Free' : formatMoney(product.monthlyFee, product.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Currency</p>
          <p className="text-sm font-semibold mt-0.5">{product.currency}</p>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-1.5">
        {product.features.slice(0, 4).map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            {feature}
          </li>
        ))}
        {product.features.length > 4 && (
          <li className="text-xs text-muted-foreground pl-5">+{product.features.length - 4} more features</li>
        )}
      </ul>
    </button>
  );
}
