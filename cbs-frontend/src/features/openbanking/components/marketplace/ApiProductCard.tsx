import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Globe,
  CreditCard,
  Banknote,
  Users,
  ShieldCheck,
  BarChart3,
  Clock,
  Eye,
  Link2,
  Zap,
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
  const authLabel = AUTH_LABELS[product.authMethod] ?? product.authMethod;

  return (
    <div className="ob-page-panel h-full transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', categoryColor)}>
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {product.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                    categoryColor,
                  )}
                >
                  {product.category}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {product.productCode}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">v{product.version}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={product.status} dot />
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          {product.description}
        </p>

        <div className="rounded-[1.1rem] border border-border/60 bg-background/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Base path
          </p>
          <p className="mt-2 truncate font-mono text-sm text-foreground">{product.basePath}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="ob-page-soft-card">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Methods
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
              {product.supportedMethods.length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.supportedMethods.join(', ') || 'Not specified'}
            </p>
          </div>
          <div className="ob-page-soft-card">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Subscribers
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
              {product.subscriberCount.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Active consuming partners</p>
          </div>
          <div className="ob-page-soft-card">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Rate limit
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
              {product.rateLimitPerMin.toLocaleString()}/min
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{product.rateLimitTier}</p>
          </div>
          <div className="ob-page-soft-card">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              SLA uptime
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
              {product.slaUptimePct}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              P95 latency {product.slaLatencyP95Ms} ms
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {authLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            {product.requiresApproval ? 'Approval required' : 'Self-service eligible'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            {product.sandboxAvailable ? 'Sandbox ready' : 'Production only'}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div className="text-xs text-muted-foreground">
            {product.documentationUrl ? 'Documentation linked' : 'Documentation pending'}{' '}
            <span className="font-medium text-foreground">
              {product.pricingModel.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            {product.documentationUrl && (
              <a
                href={product.documentationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Docs
              </a>
            )}
            <button
              onClick={() => onViewDetails?.(product)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Eye className="h-3.5 w-3.5" />
              View Details
            </button>
            {product.status === 'PUBLISHED' && (
              <button
                onClick={() => onSubscribe?.(product)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Subscribe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
