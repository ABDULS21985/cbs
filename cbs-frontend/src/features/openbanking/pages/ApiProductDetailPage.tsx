import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Activity,
  Ban,
  BarChart3,
  CheckCircle2,
  Globe,
  Loader2,
  Lock,
  Unlock,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { useApiProducts, useProductAnalytics, usePublishProduct, useDeprecateProduct } from '../hooks/useMarketplace';
import type { ApiEndpoint } from '../api/marketplaceApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_CHIP: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-amber-100 text-amber-700',
  DEPRECATED: 'bg-gray-100 text-gray-600',
};

function EndpointRow({ endpoint }: { endpoint: ApiEndpoint }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={cn('font-mono text-xs px-2 py-0.5 rounded shrink-0 w-16 text-center', METHOD_COLOR[endpoint.method])}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono flex-1 truncate">{endpoint.path}</code>
        {endpoint.authRequired
          ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          : <Unlock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        }
      </button>
      {expanded && (
        <div className="border-t p-3 bg-muted/30 space-y-3">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          {endpoint.exampleRequest && (
            <div>
              <p className="text-xs font-medium mb-1">Example Request</p>
              <pre className="text-xs bg-zinc-950 text-zinc-100 p-3 rounded overflow-x-auto">{endpoint.exampleRequest}</pre>
            </div>
          )}
          {endpoint.exampleResponse && (
            <div>
              <p className="text-xs font-medium mb-1">Example Response</p>
              <pre className="text-xs bg-zinc-950 text-zinc-100 p-3 rounded overflow-x-auto">{endpoint.exampleResponse}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ApiProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: products = [], isLoading } = useApiProducts();
  const product = useMemo(() => products.find(p => String(p.id) === id), [products, id]);
  const { data: analytics = [] } = useProductAnalytics(product?.id ?? 0);

  const publish = usePublishProduct();
  const deprecate = useDeprecateProduct();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">API Product not found.</p>
        <button
          className="text-sm text-primary hover:underline"
          onClick={() => navigate('/open-banking/marketplace')}
        >
          ← Back to Marketplace
        </button>
      </div>
    );
  }

  const totalCalls = analytics.reduce((s, a) => s + a.totalCalls, 0);
  const totalErrors = analytics.reduce((s, a) => s + a.errorCalls, 0);
  const avgLatency = analytics.length
    ? Math.round(analytics.reduce((s, a) => s + a.avgLatencyMs, 0) / analytics.length)
    : 0;

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-3">Product Details</h3>
            <div className="divide-y">
              {[
                ['Name', product.name],
                ['Category', product.category],
                ['Version', product.version],
                ['Auth Method', product.authMethod],
                ['Rate Limit', `${product.rateLimitPerMin}/min`],
                ['SLA Uptime', `${product.slaUptimePct}%`],
                ['SLA P95 Latency', `${product.slaLatencyP95Ms}ms`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-3">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{product.endpointCount}</p>
                <p className="text-xs text-muted-foreground">Endpoints</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{product.subscriberCount}</p>
                <p className="text-xs text-muted-foreground">Subscribers</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'endpoints',
      label: 'Endpoints',
      badge: product.endpointCount,
      content: (
        <div className="p-6 space-y-2">
          {(product.endpoints ?? []).length === 0 ? (
            <div className="surface-card p-12 text-center text-sm text-muted-foreground">
              No endpoint definitions available.
            </div>
          ) : (
            (product.endpoints ?? []).map((ep, i) => <EndpointRow key={i} endpoint={ep} />)
          )}
        </div>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      content: (
        <div className="p-6 space-y-6">
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-4">API Call Volume</h3>
            {analytics.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No analytics data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics}>
                  <defs>
                    <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="successCalls" stroke="#22c55e" fill="url(#successGrad)" name="Success" />
                  <Area type="monotone" dataKey="errorCalls" stroke="#ef4444" fill="none" strokeDasharray="3 3" name="Errors" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-4">P95 Latency (ms)</h3>
            {analytics.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="p95LatencyMs" fill="#f59e0b" name="P95 (ms)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'changelog',
      label: 'Changelog',
      content: (
        <div className="p-6">
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-4">Version History</h3>
            {product.changelog ? (
              <pre className="text-sm whitespace-pre-wrap leading-relaxed">{product.changelog}</pre>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                No changelog available for this product.
              </p>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-0">
      <PageHeader
        title={product.name}
        subtitle={`${product.category} · v${product.version}`}
        backTo="/open-banking/marketplace"
        actions={
          <div className="flex gap-2">
            {product.status === 'DRAFT' && (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                onClick={() => publish.mutate(product.id, {
                  onSuccess: () => toast.success('Product published'),
                  onError: () => toast.error('Failed to publish'),
                })}
                disabled={publish.isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> Publish
              </button>
            )}
            {product.status === 'PUBLISHED' && (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background text-sm hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => deprecate.mutate(product.id, {
                  onSuccess: () => toast.success('Product deprecated'),
                  onError: () => toast.error('Failed to deprecate'),
                })}
                disabled={deprecate.isPending}
              >
                <Ban className="h-4 w-4" /> Deprecate
              </button>
            )}
          </div>
        }
      />

      {/* Status Strip */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-muted/30">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_CHIP[product.status])}>
            {product.status}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs border">{product.category}</span>
          <span className="px-2 py-0.5 rounded-full text-xs border">{product.authMethod}</span>
          <span className="text-xs text-muted-foreground ml-1">
            {product.endpointCount} endpoints · {product.subscriberCount} subscribers
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Activity, label: 'Total Calls (30d)', value: totalCalls.toLocaleString(), color: 'text-blue-600' },
            { icon: Zap, label: 'Avg Latency', value: `${avgLatency}ms`, color: 'text-amber-600' },
            { icon: Globe, label: 'Subscribers', value: product.subscriberCount.toString(), color: 'text-green-600' },
            { icon: BarChart3, label: 'Error Rate', value: totalCalls ? `${((totalErrors / totalCalls) * 100).toFixed(2)}%` : '—', color: 'text-rose-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="surface-card p-4 flex items-center gap-3">
              <Icon className={cn('h-8 w-8', color)} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value}</p>
              </div>
            </div>
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
