import { cn } from '@/lib/utils';
import {
  Globe,
  CreditCard,
  Banknote,
  Users,
  ShieldCheck,
  BarChart3,
  Link2,
  Zap,
  Clock,
  Eye,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { ApiProduct } from '../../api/marketplaceApi';

interface ApiProductCardProps {
  product: ApiProduct;
  onViewDetails?: (product: ApiProduct) => void;
  onSubscribe?: (product: ApiProduct) => void;
}

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  Accounts: Banknote,
  Payments: CreditCard,
  Cards: CreditCard,
  Loans: BarChart3,
  Customer: Users,
  Compliance: ShieldCheck,
};

const CATEGORY_COLORS: Record<string, string> = {
  Accounts: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Payments: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  Cards: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Loans: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  Customer: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  Compliance: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const AUTH_LABELS: Record<string, string> = {
  OAUTH2: 'OAuth 2.0',
  API_KEY: 'API Key',
  BOTH: 'OAuth 2.0 + API Key',
};

export function ApiProductCard({ product, onViewDetails, onSubscribe }: ApiProductCardProps) {
  const CategoryIcon = CATEGORY_ICONS[product.category] || Globe;
  const categoryColor = CATEGORY_COLORS[product.category] || 'bg-muted text-muted-foreground';

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', categoryColor)}>
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{product.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', categoryColor)}>
                  {product.category}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">v{product.version}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={product.status} />
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
          {product.description}
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Endpoints:</span>
            <span className="font-semibold tabular-nums">{product.endpointCount}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Subscribers:</span>
            <span className="font-semibold tabular-nums">{product.subscriberCount}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Rate:</span>
            <span className="font-semibold tabular-nums">{product.rateLimitPerMin}/min</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">SLA:</span>
            <span className="font-semibold tabular-nums">{product.slaUptimePct}%</span>
          </div>
        </div>

        {/* Auth method */}
        <div className="text-xs text-muted-foreground mb-4">
          Auth: <span className="font-medium text-foreground">{AUTH_LABELS[product.authMethod]}</span>
        </div>
      </div>

      {/* Actions footer */}
      <div className="flex items-center gap-2 px-5 py-3 border-t bg-muted/20">
        <button
          onClick={() => onViewDetails?.(product)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors flex-1 justify-center"
        >
          <Eye className="w-3.5 h-3.5" />
          View Details
        </button>
        {product.status === 'PUBLISHED' && (
          <button
            onClick={() => onSubscribe?.(product)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex-1 justify-center"
          >
            Subscribe
          </button>
        )}
      </div>
    </div>
  );
}
