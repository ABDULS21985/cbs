import { Inbox } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
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
    <div className="surface-card overflow-hidden animate-pulse">
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted" />
          <div className="space-y-1.5">
            <div className="w-32 h-4 rounded bg-muted" />
            <div className="w-20 h-3 rounded bg-muted" />
          </div>
        </div>
        <div className="w-full h-3 rounded bg-muted" />
        <div className="w-3/4 h-3 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="w-full h-3 rounded bg-muted" />
          <div className="w-full h-3 rounded bg-muted" />
          <div className="w-full h-3 rounded bg-muted" />
          <div className="w-full h-3 rounded bg-muted" />
        </div>
      </div>
      <div className="px-5 py-3 border-t bg-muted/20">
        <div className="w-full h-7 rounded bg-muted" />
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
      <EmptyState
        icon={Inbox}
        title="No API products found"
        description="Try adjusting your search or category filter."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
