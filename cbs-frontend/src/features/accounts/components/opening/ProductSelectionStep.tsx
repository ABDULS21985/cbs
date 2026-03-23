import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared';
import { accountOpeningApi, type Product } from '../../api/accountOpeningApi';
import { ProductCard } from './ProductCard';

interface ProductSelectionStepProps {
  customerId: string;
  onNext: (product: Product, currency: string) => void;
  onBack: () => void;
}

type ProductTypeFilter = 'ALL' | 'SAVINGS' | 'CURRENT' | 'DOMICILIARY';

const DOMICILIARY_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN'];

const filterLabels: Record<ProductTypeFilter, string> = {
  ALL: 'All Products',
  SAVINGS: 'Savings',
  CURRENT: 'Current',
  DOMICILIARY: 'Domiciliary',
};

export function ProductSelectionStep({ customerId, onNext, onBack }: ProductSelectionStepProps) {
  const [filter, setFilter] = useState<ProductTypeFilter>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [domCurrency, setDomCurrency] = useState('USD');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', 'eligible', customerId],
    queryFn: () => accountOpeningApi.getEligibleProducts({ customerId }),
  });

  const filtered = filter === 'ALL' ? products : products.filter((p) => p.type === filter);
  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  const handleNext = () => {
    if (!selectedProduct) return;
    const currency = selectedProduct.type === 'DOMICILIARY' ? domCurrency : selectedProduct.currency;
    onNext(selectedProduct, currency);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Select Product</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose the account product that best suits the customer's needs.</p>
      </div>

      {/* Filter tabs */}
      <div className="opening-section-card p-2">
        <div className="flex gap-1.5 flex-wrap">
        {(['ALL', 'SAVINGS', 'CURRENT', 'DOMICILIARY'] as ProductTypeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setSelectedProductId(null);
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background/80 text-muted-foreground hover:text-foreground',
            )}
          >
            {filterLabels[f]}
          </button>
        ))}
        </div>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No products found" description="No eligible products match the selected filter." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selectedProductId === product.id}
              onClick={() => setSelectedProductId(product.id)}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <div className="opening-note-card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{selectedProduct.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedProduct.type} product · Base currency {selectedProduct.currency}
            </p>
          </div>
          <div className="opening-hero-chip">{selectedProduct.type === 'DOMICILIARY' ? domCurrency : selectedProduct.currency}</div>
        </div>
      )}

      {/* Domiciliary currency selector */}
      {selectedProduct?.type === 'DOMICILIARY' && (
        <div className="opening-section-card border-teal-200 bg-teal-50/50 dark:border-teal-800/40 dark:bg-teal-900/10">
          <label className="block text-sm font-medium mb-2">Select Account Currency</label>
          <div className="flex gap-2 flex-wrap">
            {DOMICILIARY_CURRENCIES.map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setDomCurrency(cur)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                  domCurrency === cur
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-border bg-background hover:border-teal-400',
                )}
              >
                {cur}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The account will be denominated in <strong>{domCurrency}</strong>.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          disabled={!selectedProduct}
          onClick={handleNext}
          className={cn('btn-primary', !selectedProduct && 'cursor-not-allowed opacity-60')}
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
