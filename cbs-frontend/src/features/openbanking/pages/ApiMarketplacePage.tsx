import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  RefreshCw,
  Globe,
  Package,
  CheckCircle2,
  Clock,
  Ban,
  Layers,
} from 'lucide-react';

import {
  useApiProducts,
  useApiSubscriptions,
  usePublishProduct,
  useDeprecateProduct,
  useApproveSubscription,
  useCreateApiProduct,
  useSubscribeToApi,
} from '../hooks/useMarketplace';
import { useTppClients } from '../hooks/useOpenBanking';
import type { ApiProduct } from '../api/marketplaceApi';
import { ApiProductCard } from '../components/marketplace/ApiProductCard';
import { ApiProductGrid } from '../components/marketplace/ApiProductGrid';

// ─── Categories ──────────────────────────────────────────────────────────────

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
  const [tab, setTab] = useState('catalogue');

  const { data: products = [], isLoading, refetch, isFetching } = useApiProducts();
  const { data: subscriptions = [], isLoading: subsLoading } = useApiSubscriptions();
  const { data: tppClients = [] } = useTppClients();
  const publish = usePublishProduct();
  const deprecate = useDeprecateProduct();
  const approveSubscription = useApproveSubscription();
  const createProduct = useCreateApiProduct();
  const subscribe = useSubscribeToApi();

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

  function handlePublish(id: number) {
    publish.mutate(id, {
      onSuccess: () => toast.success('Product published'),
      onError: () => toast.error('Failed to publish'),
    });
  }

  function handleDeprecate(id: number) {
    deprecate.mutate(id, {
      onSuccess: () => toast.success('Product deprecated'),
      onError: () => toast.error('Failed to deprecate'),
    });
  }

  function handleApproveSub(id: number) {
    approveSubscription.mutate(id, {
      onSuccess: () => toast.success('Subscription approved'),
      onError: () => toast.error('Failed to approve'),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Marketplace"
        description="Publish and manage open banking API products for third-party integrations"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate('/open-banking/developer')}>
              <Globe className="mr-1.5 h-4 w-4" /> Developer Portal
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: CheckCircle2, label: 'Published', value: stats.published, color: 'text-green-600', filter: 'PUBLISHED' },
          { icon: Clock, label: 'Draft', value: stats.draft, color: 'text-amber-600', filter: 'DRAFT' },
          { icon: Ban, label: 'Deprecated', value: stats.deprecated, color: 'text-gray-500', filter: 'DEPRECATED' },
          { icon: Layers, label: 'Subscriptions', value: stats.totalSubs, color: 'text-blue-600', filter: null },
          { icon: Clock, label: 'Pending Subs', value: stats.pendingSubs, color: 'text-orange-600', filter: null },
        ].map(({ icon: Icon, label, value, color, filter }) => (
          <button
            key={label}
            className={`p-4 rounded-lg border bg-card text-left hover:bg-muted/50 transition-colors ${filter && statusFilter === filter ? 'ring-2 ring-primary' : ''}`}
            onClick={() => filter && setStatusFilter(s => s === filter ? 'ALL' : filter)}
          >
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="catalogue">
            API Catalogue
            <Badge variant="secondary" className="ml-2 h-4 text-xs">{filtered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions
            {stats.pendingSubs > 0 && (
              <Badge variant="destructive" className="ml-2 h-4 text-xs">{stats.pendingSubs}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Catalogue ───────────────────────────────────────────────────── */}
        <TabsContent value="catalogue" className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${category === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted border-border'
                  }`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <ApiProductGrid
            products={filtered}
            isLoading={isLoading}
            onPublish={handlePublish}
            onDeprecate={handleDeprecate}
            onView={(p) => navigate(`/open-banking/marketplace/${p.id}`)}
          />
        </TabsContent>

        {/* ── Subscriptions ───────────────────────────────────────────────── */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">API Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : subscriptions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No subscriptions yet.</p>
              ) : (
                <div className="divide-y">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {sub.productName ?? `Product #${sub.productId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sub.tppClientName ?? `TPP #${sub.tppClientId}`} · Subscribed {formatDate(sub.subscribedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={sub.status === 'APPROVED' ? 'default' : sub.status === 'PENDING' ? 'secondary' : 'destructive'}
                        >
                          {sub.status}
                        </Badge>
                        {sub.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveSub(sub.id)}
                            disabled={approveSubscription.isPending}
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString(); }
  catch { return dateStr; }
}
