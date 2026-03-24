import { Inbox } from 'lucide-react';
import { ApiProductCard } from './ApiProductCard';
import type { ApiProduct } from '../../api/marketplaceApi';

interface ApiProductGridProps {
  products: ApiProduct[];
  isLoading?: boolean;
  onViewDetails?: (product: ApiProduct) => void;
  onSubscribe?: (product: ApiProduct) => void;
}

function SkeletonCard() {
  return (
    <div className="ob-page-panel animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-muted" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-2xl bg-muted/70" />
          <div className="h-16 rounded-2xl bg-muted/70" />
          <div className="h-16 rounded-2xl bg-muted/70" />
          <div className="h-16 rounded-2xl bg-muted/70" />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
          <div className="h-10 rounded-full bg-muted/70" />
          <div className="h-10 rounded-full bg-muted/70" />
        </div>
      </div>
    </div>
  );
}

export function ApiProductGrid({ products, isLoading, onViewDetails, onSubscribe }: ApiProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="ob-page-empty-state">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-base font-semibold text-foreground">No API products found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting the live search or category filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ApiProductCard
          key={product.id}
          product={product}
          onViewDetails={onViewDetails}
          onSubscribe={onSubscribe}
        />
      ))}
    </div>
  );
}
