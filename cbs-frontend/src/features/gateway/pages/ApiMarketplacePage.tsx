import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Package, Users, Activity, Clock, Plus, X, Loader2,
  ExternalLink, CheckCircle, Globe, Code, Zap, Shield,
  AlertTriangle, Eye, BarChart3,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage, EmptyState } from '@/components/shared';
import { formatMoney, formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  usePublishedProducts,
  useProductAnalytics,
  useCreateMarketplaceProduct,
  usePublishProduct,
  useDeprecateProduct,
  useMarketplaceSubscriptions,
  useMarketplaceSubscribe,
  useApproveSubscription,
} from '../hooks/useGatewayData';
import type { MarketplaceApiProduct, MarketplaceSubscription, MarketplaceUsageLog } from '../types/marketplace';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', PUBLISHED: 'bg-green-100 text-green-700',
  DEPRECATED: 'bg-amber-100 text-amber-700',
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700', POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700', PATCH: 'bg-purple-100 text-purple-700',
  DELETE: 'bg-red-100 text-red-700',
};

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700', BASIC: 'bg-blue-100 text-blue-700',
  STANDARD: 'bg-indigo-100 text-indigo-700', PREMIUM: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700', UNLIMITED: 'bg-green-100 text-green-700',
};

const PLAN_LIMITS: Record<string, number> = {
  FREE: 100, BASIC: 1000, STANDARD: 10000, PREMIUM: 100000, ENTERPRISE: 500000, UNLIMITED: 0,
};

const CATEGORIES = ['ACCOUNTS', 'PAYMENTS', 'CARDS', 'LENDING', 'COMPLIANCE', 'TREASURY', 'CUSTOMER', 'ANALYTICS', 'REFERENCE_DATA'];

const CHART_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// ─── Product Card ───────────────────────────────────────────────────────────

function ProductCard({ product, onPublish, onDeprecate }: {
  product: MarketplaceApiProduct;
  onPublish: (id: number) => void;
  onDeprecate: (id: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{product.productName}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', STATUS_COLORS[product.status] ?? 'bg-gray-100')}>{product.status}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted">{product.productCategory}</span>
            <span className="text-[10px] text-muted-foreground font-mono">v{product.apiVersion}</span>
          </div>
        </div>
      </div>

      {product.description && <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>}

      <p className="text-[10px] font-mono text-muted-foreground">{product.basePath}</p>

      {/* Methods */}
      <div className="flex gap-1 flex-wrap">
        {product.supportedMethods?.map((m) => (
          <span key={m} className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', METHOD_COLORS[m] ?? 'bg-gray-100')}>{m}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Rate: </span><span className="font-medium">{product.rateLimitPerMin}/min</span></div>
        <div><span className="text-muted-foreground">Pricing: </span>
          {product.pricingModel === 'FREE' ? <span className="font-bold text-green-600">FREE</span>
            : product.pricingModel === 'PAY_PER_CALL' ? <span className="font-mono">{formatMoney(product.pricePerCall)}/call</span>
            : <span className="font-mono">{formatMoney(product.monthlyPrice)}/mo</span>}
        </div>
        <div className="flex items-center gap-1">
          {product.sandboxAvailable ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
          <span className="text-muted-foreground">Sandbox</span>
        </div>
        <div className="flex items-center gap-1">
          {product.requiresApproval ? <Shield className="w-3 h-3 text-amber-500" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
          <span className="text-muted-foreground">{product.requiresApproval ? 'Approval Req.' : 'Auto-approve'}</span>
        </div>
      </div>

      <div className="flex gap-1.5 pt-1 border-t">
        {product.status === 'DRAFT' && (
          <button onClick={() => onPublish(product.id)} className="text-[10px] text-green-600 hover:underline font-medium">Publish</button>
        )}
        {product.status === 'PUBLISHED' && (
          <button onClick={() => onDeprecate(product.id)} className="text-[10px] text-amber-600 hover:underline font-medium">Deprecate</button>
        )}
        {product.documentationUrl && (
          <a href={product.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5 ml-auto">
            Docs <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Create Product Dialog ──────────────────────────────────────────────────

function CreateProductDialog({ onClose }: { onClose: () => void }) {
  const createProduct = useCreateMarketplaceProduct();
  const fc = 'w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 border-border';
  const [form, setForm] = useState({
    productCode: '', productName: '', productCategory: 'ACCOUNTS', apiVersion: 'v1',
    description: '', documentationUrl: '', basePath: '/api/v1/',
    supportedMethods: ['GET'] as string[], rateLimitTier: 'STANDARD', rateLimitPerMin: 60,
    pricingModel: 'FREE', pricePerCall: 0, monthlyPrice: 0,
    sandboxAvailable: true, requiresApproval: false,
  });

  const toggleMethod = (m: string) => setForm((f) => ({
    ...f, supportedMethods: f.supportedMethods.includes(m) ? f.supportedMethods.filter((x) => x !== m) : [...f.supportedMethods, m],
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">New API Product</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Product Code *</label><input className={cn(fc, 'mt-1 font-mono')} value={form.productCode} onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Product Name *</label><input className={cn(fc, 'mt-1')} value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Category</label>
              <select className={cn(fc, 'mt-1')} value={form.productCategory} onChange={(e) => setForm((f) => ({ ...f, productCategory: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">API Version</label><input className={cn(fc, 'mt-1')} value={form.apiVersion} onChange={(e) => setForm((f) => ({ ...f, apiVersion: e.target.value }))} /></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Description</label><textarea className={cn(fc, 'mt-1 h-16 resize-none')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Base Path *</label><input className={cn(fc, 'mt-1 font-mono text-xs')} value={form.basePath} onChange={(e) => setForm((f) => ({ ...f, basePath: e.target.value }))} /></div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">HTTP Methods</label>
            <div className="flex gap-1.5">
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                <button key={m} type="button" onClick={() => toggleMethod(m)}
                  className={cn('px-2.5 py-1 rounded text-xs font-bold border transition-colors',
                    form.supportedMethods.includes(m) ? cn(METHOD_COLORS[m], 'border-transparent') : 'border-border text-muted-foreground')}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Rate Limit Tier</label>
              <select className={cn(fc, 'mt-1')} value={form.rateLimitTier} onChange={(e) => {
                const tier = e.target.value;
                const limits: Record<string, number> = { BASIC: 30, STANDARD: 60, PREMIUM: 120, UNLIMITED: 9999 };
                setForm((f) => ({ ...f, rateLimitTier: tier, rateLimitPerMin: limits[tier] ?? 60 }));
              }}>
                <option value="BASIC">Basic (30/min)</option>
                <option value="STANDARD">Standard (60/min)</option>
                <option value="PREMIUM">Premium (120/min)</option>
                <option value="UNLIMITED">Unlimited</option>
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Rate Limit/min</label>
              <input type="number" className={cn(fc, 'mt-1')} value={form.rateLimitPerMin} onChange={(e) => setForm((f) => ({ ...f, rateLimitPerMin: parseInt(e.target.value) || 60 }))} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Pricing Model</label>
              <select className={cn(fc, 'mt-1')} value={form.pricingModel} onChange={(e) => setForm((f) => ({ ...f, pricingModel: e.target.value }))}>
                <option value="FREE">Free</option>
                <option value="PAY_PER_CALL">Pay per Call</option>
                <option value="MONTHLY_SUBSCRIPTION">Monthly</option>
                <option value="TIERED">Tiered</option>
              </select></div>
            {form.pricingModel === 'PAY_PER_CALL' && (
              <div><label className="text-xs font-medium text-muted-foreground">Price/Call (₦)</label>
                <input type="number" step="0.01" className={cn(fc, 'mt-1')} value={form.pricePerCall || ''} onChange={(e) => setForm((f) => ({ ...f, pricePerCall: parseFloat(e.target.value) || 0 }))} /></div>
            )}
            {form.pricingModel === 'MONTHLY_SUBSCRIPTION' && (
              <div><label className="text-xs font-medium text-muted-foreground">Monthly (₦)</label>
                <input type="number" className={cn(fc, 'mt-1')} value={form.monthlyPrice || ''} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: parseFloat(e.target.value) || 0 }))} /></div>
            )}
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.sandboxAvailable} onChange={(e) => setForm((f) => ({ ...f, sandboxAvailable: e.target.checked }))} className="rounded border-border w-4 h-4" />
              Sandbox Available
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))} className="rounded border-border w-4 h-4" />
              Requires Approval
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => createProduct.mutate(form as unknown as Partial<MarketplaceApiProduct>, {
              onSuccess: () => { toast.success('Product created'); onClose(); },
              onError: () => toast.error('Failed'),
            })} disabled={!form.productCode || !form.productName || createProduct.isPending} className="btn-primary flex items-center gap-2">
              {createProduct.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ApiMarketplacePage() {
  useEffect(() => { document.title = 'API Marketplace | CBS'; }, []);

  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [analyticsProductId, setAnalyticsProductId] = useState(0);
  const [subForm, setSubForm] = useState({ productId: 0, subscriberName: '', subscriberEmail: '', planTier: 'STANDARD' });

  const { data: products = [], isLoading: productsLoading } = usePublishedProducts();
  const { data: subscriptions = [] } = useMarketplaceSubscriptions();
  const { data: analyticsData } = useProductAnalytics(analyticsProductId);
  const publishProduct = usePublishProduct();
  const deprecateProduct = useDeprecateProduct();
  const approveSubscription = useApproveSubscription();
  const subscribeMutation = useMarketplaceSubscribe();

  const publishedCount = products.filter((p) => p.status === 'PUBLISHED').length;

  const handlePublish = (id: number) => {
    publishProduct.mutate(id, { onSuccess: () => toast.success('Product published'), onError: () => toast.error('Failed') });
  };
  const handleDeprecate = (id: number) => {
    deprecateProduct.mutate(id, { onSuccess: () => toast.success('Product deprecated'), onError: () => toast.error('Failed') });
  };

  // Subscription columns
  const subCols: ColumnDef<MarketplaceSubscription, unknown>[] = [
    { accessorKey: 'subscriptionId', header: 'ID', cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.subscriptionId}</span> },
    { accessorKey: 'apiProductId', header: 'Product', cell: ({ row }) => {
      const prod = products.find((p) => p.id === row.original.apiProductId);
      return <span className="text-xs font-medium">{prod?.productName ?? `#${row.original.apiProductId}`}</span>;
    }},
    { accessorKey: 'subscriberName', header: 'Subscriber', cell: ({ row }) => <span className="text-sm font-medium">{row.original.subscriberName}</span> },
    { accessorKey: 'subscriberEmail', header: 'Email', cell: ({ row }) => <span className="text-xs">{row.original.subscriberEmail}</span> },
    { accessorKey: 'planTier', header: 'Plan', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', PLAN_COLORS[row.original.planTier] ?? 'bg-gray-100')}>{row.original.planTier}</span> },
    { accessorKey: 'monthlyCallLimit', header: 'Limit', cell: ({ row }) => <span className="text-xs font-mono">{row.original.monthlyCallLimit.toLocaleString()}/mo</span> },
    {
      id: 'usage', header: 'Usage',
      cell: ({ row }) => {
        const pct = row.original.monthlyCallLimit > 0 ? (row.original.callsThisMonth / row.original.monthlyCallLimit) * 100 : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-[10px] font-mono">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => row.original.status === 'PENDING' ? (
        <button onClick={() => approveSubscription.mutate(String(row.original.id), { onSuccess: () => toast.success('Approved') })}
          className="text-xs text-green-600 hover:underline font-medium">Approve</button>
      ) : null,
    },
  ];

  // Analytics usage columns
  const usageCols: ColumnDef<MarketplaceUsageLog, unknown>[] = [
    { accessorKey: 'endpointPath', header: 'Endpoint', cell: ({ row }) => <span className="font-mono text-xs">{row.original.endpointPath}</span> },
    { accessorKey: 'httpMethod', header: 'Method', cell: ({ row }) => <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', METHOD_COLORS[row.original.httpMethod] ?? 'bg-gray-100')}>{row.original.httpMethod}</span> },
    {
      accessorKey: 'responseCode', header: 'Code',
      cell: ({ row }) => <span className={cn('font-mono text-xs font-bold', row.original.responseCode < 300 ? 'text-green-600' : row.original.responseCode < 500 ? 'text-amber-600' : 'text-red-600')}>{row.original.responseCode}</span>,
    },
    { accessorKey: 'responseTimeMs', header: 'Time', cell: ({ row }) => <span className="font-mono text-xs">{row.original.responseTimeMs}ms</span> },
    { accessorKey: 'requestSizeBytes', header: 'Req Size', cell: ({ row }) => <span className="text-xs font-mono">{(row.original.requestSizeBytes / 1024).toFixed(1)}KB</span> },
    { accessorKey: 'ipAddress', header: 'IP', cell: ({ row }) => <span className="font-mono text-xs">{row.original.ipAddress}</span> },
    { accessorKey: 'createdAt', header: 'Time', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
  ];

  const tabs = [
    {
      id: 'catalog',
      label: 'Product Catalog',
      badge: publishedCount || undefined,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateProduct(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> New Product
            </button>
          </div>
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState title="No API products" description="Create your first API product to start the marketplace." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} onPublish={handlePublish} onDeprecate={handleDeprecate} />)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      content: (
        <div className="p-4">
          <DataTable columns={subCols} data={subscriptions} enableGlobalFilter emptyMessage="No subscriptions yet" />
        </div>
      ),
    },
    {
      id: 'analytics',
      label: 'Usage Analytics',
      content: (
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select Product</label>
            <select className="w-full mt-1 input" value={analyticsProductId} onChange={(e) => setAnalyticsProductId(parseInt(e.target.value))}>
              <option value={0}>Select a product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.productName} ({p.productCode})</option>)}
            </select>
          </div>
          {analyticsProductId > 0 && analyticsData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Subscriptions" value={(analyticsData as Record<string, number>).activeSubscriptions ?? 0} format="number" icon={Users} />
                <StatCard label="Avg Response" value={`${(analyticsData as Record<string, number>).avgResponseTimeMs ?? 0}ms`} icon={Clock} />
                <StatCard label="Errors (30d)" value={(analyticsData as Record<string, number>).errorCount ?? 0} format="number" icon={AlertTriangle} />
                <StatCard label="Total Calls" value={(analyticsData as Record<string, number>).totalCalls ?? 0} format="number" icon={Activity} />
              </div>
            </div>
          ) : (
            <EmptyState title="Select a product" description="Choose a product above to view usage analytics." />
          )}
        </div>
      ),
    },
    {
      id: 'subscribe',
      label: 'Subscribe',
      content: (
        <div className="p-4 max-w-md">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="text-sm font-semibold">Create Subscription</h3>
            <div><label className="text-xs font-medium text-muted-foreground">Product</label>
              <select className="w-full mt-1 input" value={subForm.productId} onChange={(e) => setSubForm((p) => ({ ...p, productId: parseInt(e.target.value) || 0 }))}>
                <option value={0}>Select product...</option>
                {products.filter((p) => p.status === 'PUBLISHED').map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Subscriber Name *</label>
              <input className="w-full mt-1 input" value={subForm.subscriberName} onChange={(e) => setSubForm((p) => ({ ...p, subscriberName: e.target.value }))} placeholder="Organization or individual name" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" className="w-full mt-1 input" value={subForm.subscriberEmail} onChange={(e) => setSubForm((p) => ({ ...p, subscriberEmail: e.target.value }))} placeholder="contact@example.com" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Plan Tier</label>
              <select className="w-full mt-1 input" value={subForm.planTier} onChange={(e) => setSubForm((p) => ({ ...p, planTier: e.target.value }))}>
                {Object.entries(PLAN_LIMITS).map(([tier, limit]) => (
                  <option key={tier} value={tier}>{tier} — {limit > 0 ? `${limit.toLocaleString()} calls/month` : 'No limit'}</option>
                ))}
              </select></div>
            <button
              className="btn-primary w-full"
              disabled={!subForm.productId || !subForm.subscriberName || subscribeMutation.isPending}
              onClick={() => subscribeMutation.mutate(
                { productId: subForm.productId, subscriberName: subForm.subscriberName, subscriberEmail: subForm.subscriberEmail || undefined, planTier: subForm.planTier },
                { onSuccess: () => { toast.success('Subscription created'); setSubForm({ productId: 0, subscriberName: '', subscriberEmail: '', planTier: 'STANDARD' }); }, onError: () => toast.error('Subscription failed') },
              )}
            >
              {subscribeMutation.isPending ? 'Creating...' : 'Create Subscription'}
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showCreateProduct && <CreateProductDialog onClose={() => setShowCreateProduct(false)} />}

      <PageHeader
        title="API Marketplace"
        subtitle="API product catalog, subscriptions, and usage analytics"
        actions={
          <button onClick={() => setShowCreateProduct(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> New Product
          </button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Published Products" value={publishedCount} format="number" icon={Package} loading={productsLoading} />
          <StatCard label="Total Products" value={products.length} format="number" icon={Globe} loading={productsLoading} />
          <StatCard label="Draft" value={products.filter((p) => p.status === 'DRAFT').length} format="number" icon={Code} loading={productsLoading} />
          <StatCard label="Deprecated" value={products.filter((p) => p.status === 'DEPRECATED').length} format="number" icon={AlertTriangle} loading={productsLoading} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
