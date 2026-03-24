import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Ban,
  CheckCircle2,
  Clock,
  Globe,
  LockKeyhole,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';

import {
  useApiProducts,
  useApiSubscriptions,
  useApproveSubscription,
} from '../hooks/useMarketplace';
import { ApiProductGrid } from '../components/marketplace/ApiProductGrid';

// ─── Page ────────────────────────────────────────────────────────────────────

export function ApiMarketplacePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: products = [], isLoading, refetch, isFetching } = useApiProducts();
  const { data: subscriptions = [], isLoading: subsLoading } = useApiSubscriptions();
  const approveSubscription = useApproveSubscription();

  const productsWithUsage = useMemo(() => {
    const subscriptionCounts = subscriptions.reduce<Record<number, number>>((acc, subscription) => {
      acc[subscription.productId] = (acc[subscription.productId] ?? 0) + 1;
      return acc;
    }, {});

    return products.map((product) => ({
      ...product,
      subscriberCount: subscriptionCounts[product.id] ?? product.subscriberCount,
    }));
  }, [products, subscriptions]);

  const categories = useMemo(() => {
    const liveCategories = Array.from(
      new Set(productsWithUsage.map((product) => product.category).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));

    return ['All', ...liveCategories];
  }, [productsWithUsage]);

  const filtered = useMemo(() => {
    return productsWithUsage.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.productCode.toLowerCase().includes(search.toLowerCase()) ||
        p.basePath.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'All' || p.category === category;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [productsWithUsage, search, category, statusFilter]);

  const productNameMap = useMemo(
    () =>
      productsWithUsage.reduce<Record<number, string>>((acc, product) => {
        acc[product.id] = product.name;
        return acc;
      }, {}),
    [productsWithUsage],
  );

  const stats = useMemo(
    () => ({
      totalProducts: productsWithUsage.length,
      published: productsWithUsage.filter((p) => p.status === 'PUBLISHED').length,
      draft: productsWithUsage.filter((p) => p.status === 'DRAFT').length,
      deprecated: productsWithUsage.filter((p) => p.status === 'DEPRECATED').length,
      approvalRequired: productsWithUsage.filter((p) => p.requiresApproval).length,
      sandboxReady: productsWithUsage.filter((p) => p.sandboxAvailable).length,
      totalSubs: subscriptions.length,
      pendingSubs: subscriptions.filter((s) => s.status === 'PENDING').length,
    }),
    [productsWithUsage, subscriptions],
  );

  const statCards = [
    {
      icon: CheckCircle2,
      label: 'Published',
      value: stats.published,
      description: 'Live products available to TPPs',
      color: 'text-emerald-600',
      filter: 'PUBLISHED' as const,
    },
    {
      icon: Clock,
      label: 'Draft',
      value: stats.draft,
      description: 'Products still in staging',
      color: 'text-amber-600',
      filter: 'DRAFT' as const,
    },
    {
      icon: Ban,
      label: 'Deprecated',
      value: stats.deprecated,
      description: 'Contracts marked for retirement',
      color: 'text-slate-500',
      filter: 'DEPRECATED' as const,
    },
    {
      icon: Layers,
      label: 'Subscriptions',
      value: stats.totalSubs,
      description: 'Active commercial relationships',
      color: 'text-sky-600',
      filter: null,
    },
  ];

  const tabs = [
    {
      id: 'catalogue',
      label: 'API Catalogue',
      badge: filtered.length,
      content: (
        <div className="page-container py-6">
          <div className="ob-page-workspace space-y-5">
            <div className="ob-page-panel">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="ob-page-kicker">Live catalogue filters</p>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      Search live API products
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Categories and counts are derived from the current marketplace feed, not a
                      static frontend catalogue.
                    </p>
                  </div>
                  <div className="relative w-full min-w-[220px] max-w-xl">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search products, codes, paths, and descriptions"
                      className={cn('ob-page-input pl-10')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
                  <div className="ob-page-soft-card">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Approval-gated
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                      {stats.approvalRequired}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Products that require manual subscription review.
                    </p>
                  </div>
                  <div className="ob-page-soft-card">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Sandbox-ready
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                      {stats.sandboxReady}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Products with sandbox access exposed to integrators.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ob-page-panel space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Category filters</p>
                  <p className="text-sm text-muted-foreground">
                    {filtered.length} of {productsWithUsage.length} products match the current view.
                  </p>
                </div>
                <div className="ob-page-chip-row">
                  {['ALL', 'PUBLISHED', 'DRAFT', 'DEPRECATED'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      data-active={statusFilter === status}
                      className="ob-page-filter-chip"
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === 'ALL' ? 'All statuses' : status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ob-page-chip-row">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    data-active={category === cat}
                    className="ob-page-filter-chip"
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <ApiProductGrid
              products={filtered}
              isLoading={isLoading}
              onViewDetails={(p) => navigate(`/open-banking/marketplace/${p.id}`)}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      badge: stats.pendingSubs,
      content: (
        <div className="page-container py-6">
          <div className="ob-page-workspace space-y-5">
            <div className="ob-page-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="ob-page-kicker">Subscription desk</p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Review commercial access
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Approvals here operate on the live subscription queue and reflect the same
                  marketplace contract used by TPP onboarding.
                </p>
              </div>
              <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
                <div className="ob-page-soft-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Pending approvals
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                    {stats.pendingSubs}
                  </p>
                </div>
                <div className="ob-page-soft-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Total subscriptions
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                    {stats.totalSubs}
                  </p>
                </div>
              </div>
            </div>

            {subsLoading ? (
              <div className="ob-page-panel flex justify-center py-14">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="ob-page-empty-state">
                <Layers className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-base font-semibold text-foreground">No subscriptions yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Published products will surface here as TPPs onboard and request access.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="ob-page-panel space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {sub.productName ?? productNameMap[sub.productId] ?? `Product #${sub.productId}`}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {sub.tppClientName ?? `TPP #${sub.tppClientId}`} requested access on{' '}
                          {formatDate(sub.subscribedAt)}.
                        </p>
                      </div>
                      <StatusBadge status={sub.status} dot />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="ob-page-soft-card">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Plan tier
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {sub.planTier}
                        </p>
                      </div>
                      <div className="ob-page-soft-card">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Calls this month
                        </p>
                        <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                          {sub.callsThisMonth.toLocaleString()}
                        </p>
                      </div>
                      <div className="ob-page-soft-card">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Monthly limit
                        </p>
                        <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                          {sub.monthlyCallLimit?.toLocaleString() ?? 'Uncapped'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">
                        {sub.approvedBy
                          ? `Approved by ${sub.approvedBy} on ${formatDate(sub.approvedAt ?? sub.subscribedAt)}`
                          : 'Awaiting approval action from platform operations.'}
                      </div>
                      {sub.status === 'PENDING' && (
                        <button
                          className="ob-page-action-button disabled:opacity-50"
                          onClick={() => {
                            approveSubscription.mutate(sub.subscriptionId, {
                              onSuccess: () => toast.success('Subscription approved'),
                              onError: () => toast.error('Failed to approve'),
                            });
                          }}
                          disabled={approveSubscription.isPending}
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-0">
      <PageHeader
        title="API Marketplace"
        subtitle="Publish and manage open banking API products for third-party integrations"
        actions={
          <div className="flex gap-2">
            <button
              className="ob-page-action-button disabled:opacity-50"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              onClick={() => navigate('/open-banking/developer')}
            >
              <Globe className="h-4 w-4" /> Developer Portal
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6 pb-6 pt-6">
        <section className="ob-page-hero">
          <div className="ob-page-hero-grid">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="ob-page-kicker">Marketplace control tower</p>
                <h2 className="ob-page-title">Commercialise live open-banking products</h2>
                <p className="ob-page-description">
                  Track product readiness, subscription demand, and approval workload from one
                  API-backed marketplace workspace.
                </p>
              </div>
              <div className="ob-page-chip-row">
                <span className="ob-page-chip">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {stats.totalProducts} live products
                </span>
                <span className="ob-page-chip">
                  <LockKeyhole className="h-4 w-4 text-primary" />
                  {stats.approvalRequired} approval-gated
                </span>
                <span className="ob-page-chip">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {stats.pendingSubs} approvals pending
                </span>
              </div>
            </div>

            <div className="ob-page-hero-side grid gap-3 sm:grid-cols-2">
              {statCards.map(({ icon: Icon, label, value, description, color, filter }) => (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    'ob-page-kpi-card text-left transition-transform duration-200 hover:-translate-y-0.5',
                    filter && statusFilter === filter && 'ring-2 ring-primary/30',
                  )}
                  onClick={() =>
                    filter ? setStatusFilter((current) => (current === filter ? 'ALL' : filter)) : undefined
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-5 w-5', color)} />
                    <div>
                      <p className="ob-page-kpi-label">{label}</p>
                      <p className="ob-page-kpi-value">{value.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                </button>
              ))}
              <div className="ob-page-kpi-card text-left">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="ob-page-kpi-label">Pending subs</p>
                    <p className="ob-page-kpi-value">{stats.pendingSubs.toLocaleString()}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Subscription requests waiting for manual approval.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t">
        <TabsPage tabs={tabs} />
      </div>
    </div>
  );
}
