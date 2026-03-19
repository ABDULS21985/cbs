import type React from 'react';
import { cn } from '@/lib/utils';
import type { BankingProduct, ProductType, ProductCategory, ProductStatus } from '../../api/productApi';

const TYPE_COLORS: Record<ProductType, string> = {
  SAVINGS: 'bg-blue-100 text-blue-800',
  CURRENT: 'bg-indigo-100 text-indigo-800',
  FIXED_DEPOSIT: 'bg-purple-100 text-purple-800',
  LOAN: 'bg-orange-100 text-orange-800',
  CARD: 'bg-pink-100 text-pink-800',
  INVESTMENT: 'bg-teal-100 text-teal-800',
};

const TYPE_LABELS: Record<ProductType, string> = {
  SAVINGS: 'Savings',
  CURRENT: 'Current',
  FIXED_DEPOSIT: 'Fixed Deposit',
  LOAN: 'Loan',
  CARD: 'Card',
  INVESTMENT: 'Investment',
};

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  RETAIL: 'bg-green-100 text-green-800',
  SME: 'bg-yellow-100 text-yellow-800',
  CORPORATE: 'bg-cyan-100 text-cyan-800',
  ISLAMIC: 'bg-emerald-100 text-emerald-800',
  STAFF: 'bg-gray-100 text-gray-700',
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-amber-100 text-amber-800',
  RETIRED: 'bg-gray-100 text-gray-600',
};

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return `₦${amount.toLocaleString()}`;
}

function formatRate(product: BankingProduct): string {
  if (product.interestType === 'NONE') return '—';
  if (product.interestType === 'TIERED') {
    const tiers = product.rateTiers ?? [];
    if (tiers.length === 0) return '—';
    const min = tiers[0].rate;
    const max = tiers[tiers.length - 1].rate;
    return `${min}–${max}%`;
  }
  if (product.interestRate != null) return `${product.interestRate.toFixed(1)}%`;
  return '—';
}

interface ProductTableProps {
  products: BankingProduct[];
  onRowClick: (id: string) => void;
  renderActions?: (product: BankingProduct) => React.ReactNode;
}

export function ProductTable({ products, onRowClick, renderActions }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
        <p className="text-base font-medium">No products found</p>
        <p className="text-sm mt-1">Adjust your filters or create a new product.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Currency</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rate</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Accounts</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue MTD</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            {renderActions && <th className="px-4 py-3 w-12" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr
              key={product.id}
              onClick={() => onRowClick(product.id)}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs font-medium text-muted-foreground">{product.code}</span>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">{product.shortDescription}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    TYPE_COLORS[product.type],
                  )}
                >
                  {TYPE_LABELS[product.type]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    CATEGORY_COLORS[product.category],
                  )}
                >
                  {product.category}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-mono font-medium">{product.currency}</span>
              </td>
              <td className="px-4 py-3">
                <span className="tabular-nums text-sm">{formatRate(product)}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="tabular-nums font-medium">{product.activeAccounts.toLocaleString()}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="tabular-nums font-medium text-green-700">{formatRevenue(product.revenueMTD)}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    STATUS_COLORS[product.status],
                  )}
                >
                  {product.status}
                </span>
              </td>
              {renderActions && (
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {renderActions(product)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
