import { useState, useMemo } from 'react';
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
  Layers,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

import {
  useApiProducts,
  useApiSubscriptions,
  useApproveSubscription,
} from '../hooks/useMarketplace';
import { ApiProductGrid } from '../components/marketplace/ApiProductGrid';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'All',
  'Account Information',
  'Payment Initiation',
  'Confirmation of Funds',
  'Credit & Loans',
  'FX & Rates',
  'Identity',
  'Notifications',
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function ApiMarketplacePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: products = [], isLoading, refetch, isFetching } = useApiProducts();
  const { data: subscriptions = [], isLoading: subsLoading } = useApiSubscriptions();
  const approveSubscription = useApproveSubscription();

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'All' || p.category === category;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, category, statusFilter]);

  const stats = useMemo(() => ({
    published: products.filter(p => p.status === 'PUBLISHED').length,
    draft: products.filter(p => p.status === 'DRAFT').length,
    deprecated: products.filter(p => p.status === 'DEPRECATED').length,
    totalSubs: subscriptions.length,
    pendingSubs: subscriptions.filter(s => s.status === 'PENDING').length,
  }), [products, subscriptions]);

  const tabs = [
    {
      id: 'catalogue',
      label: 'API Catalogue',
      badge: filtered.length,
      content: (
        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products…"
                className="w-full pl-9 pr-3 py-1.5 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs border transition-colors',
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted border-border',
                  )}
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
      ),
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      badge: stats.pendingSubs,
      content: (
        <div className="p-6">
          <div className="surface-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold">API Subscriptions</h3>
            </div>
            {subsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No subscriptions yet.</p>
            ) : (
              <div className="divide-y">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {sub.productName ?? `Product #${sub.productId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.tppClientName ?? `TPP #${sub.tppClientId}`} · Subscribed {formatDate(sub.subscribedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={sub.status} />
                      {sub.status === 'PENDING' && (
                        <button
                          className="px-2.5 py-1 rounded-md border text-xs hover:bg-muted transition-colors disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background text-sm hover:bg-muted transition-colors disabled:opacity-50"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              onClick={() => navigate('/open-banking/developer')}
            >
              <Globe className="h-4 w-4" /> Developer Portal
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: CheckCircle2, label: 'Published', value: stats.published, color: 'text-green-600', filter: 'PUBLISHED' as const },
            { icon: Clock, label: 'Draft', value: stats.draft, color: 'text-amber-600', filter: 'DRAFT' as const },
            { icon: Ban, label: 'Deprecated', value: stats.deprecated, color: 'text-gray-500', filter: 'DEPRECATED' as const },
            { icon: Layers, label: 'Subscriptions', value: stats.totalSubs, color: 'text-blue-600', filter: null },
            { icon: Clock, label: 'Pending Subs', value: stats.pendingSubs, color: 'text-orange-600', filter: null },
          ].map(({ icon: Icon, label, value, color, filter }) => (
            <button
              key={label}
              className={cn(
                'p-4 surface-card text-left hover:bg-muted/50 transition-colors',
                filter && statusFilter === filter ? 'ring-2 ring-primary' : '',
              )}
              onClick={() => filter && setStatusFilter(s => s === filter ? 'ALL' : filter)}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-6 w-6', color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t">
        <TabsPage tabs={tabs} />
      </div>
    </div>
  );
}
