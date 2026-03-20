import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Globe,
  Code2,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  Clock,
  Ban,
  Zap,
  Activity,
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
import type { ApiProduct, ApiEndpoint } from '../api/marketplaceApi';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_COLOR: Record<string, string> = {
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
        <Badge className={cn('font-mono text-xs shrink-0 w-16 justify-center', METHOD_COLOR[endpoint.method])}>
          {endpoint.method}
        </Badge>
        <code className="text-sm font-mono flex-1 truncate">{endpoint.path}</code>
        {endpoint.authRequired ? (
          <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        ) : (
          <Unlock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t p-3 bg-muted/30 space-y-3">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          {endpoint.exampleRequest && (
            <div>
              <p className="text-xs font-medium mb-1">Example Request</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{endpoint.exampleRequest}</pre>
            </div>
          )}
          {endpoint.exampleResponse && (
            <div>
              <p className="text-xs font-medium mb-1">Example Response</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{endpoint.exampleResponse}</pre>
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
  const [tab, setTab] = useState('overview');

  const { data: products = [], isLoading } = useApiProducts();
  const product = useMemo(
    () => products.find(p => String(p.id) === id),
    [products, id],
  );

  const { data: analytics = [] } = useProductAnalytics(product?.id ?? 0);

  const publish = usePublishProduct();
  const deprecate = useDeprecateProduct();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">API Product not found.</p>
        <Button variant="ghost" onClick={() => navigate('/open-banking/marketplace')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
        </Button>
      </div>
    );
  }

  const totalCalls = analytics.reduce((s, a) => s + a.totalCalls, 0);
  const totalErrors = analytics.reduce((s, a) => s + a.errorCalls, 0);
  const avgLatency = analytics.length
    ? Math.round(analytics.reduce((s, a) => s + a.avgLatencyMs, 0) / analytics.length)
    : 0;

  function handlePublish() {
    publish.mutate(product!.id, {
      onSuccess: () => toast.success('Product published'),
      onError: () => toast.error('Failed to publish'),
    });
  }

  function handleDeprecate() {
    deprecate.mutate(product!.id, {
      onSuccess: () => toast.success('Product deprecated'),
      onError: () => toast.error('Failed to deprecate'),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.category} · v${product.version}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/open-banking/marketplace">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Marketplace
              </Link>
            </Button>
            {product.status === 'DRAFT' && (
              <Button size="sm" onClick={handlePublish} disabled={publish.isPending}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Publish
              </Button>
            )}
            {product.status === 'PUBLISHED' && (
              <Button size="sm" variant="outline" onClick={handleDeprecate} disabled={deprecate.isPending}>
                <Ban className="mr-1.5 h-4 w-4" /> Deprecate
              </Button>
            )}
          </div>
        }
      />

      {/* Status Strip */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-muted/30">
        <Badge className={cn('text-xs', STATUS_COLOR[product.status])}>{product.status}</Badge>
        <Badge variant="outline">{product.category}</Badge>
        <Badge variant="outline">{product.authMethod}</Badge>
        <span className="text-sm text-muted-foreground">
          {product.endpointCount} endpoints · {product.subscriberCount} subscribers
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: 'Total Calls (30d)', value: totalCalls.toLocaleString(), color: 'text-blue-600' },
          { icon: Zap, label: 'Avg Latency', value: `${avgLatency}ms`, color: 'text-amber-600' },
          { icon: Globe, label: 'Subscribers', value: product.subscriberCount.toString(), color: 'text-green-600' },
          { icon: BarChart3, label: 'Error Rate', value: totalCalls ? `${((totalErrors / totalCalls) * 100).toFixed(2)}%` : '—', color: 'text-rose-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={cn('h-8 w-8', color)} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">
            Endpoints
            <Badge variant="secondary" className="ml-2 h-4 text-xs">{product.endpointCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Product Details</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {[
                  ['Name', product.name],
                  ['Category', product.category],
                  ['Version', product.version],
                  ['Auth Method', product.authMethod],
                  ['Rate Limit', `${product.rateLimitPerMin}/min`],
                  ['SLA Uptime', `${product.slaUptimePct}%`],
                  ['SLA Latency P95', `${product.slaLatencyP95Ms}ms`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Endpoints ───────────────────────────────────────────────────── */}
        <TabsContent value="endpoints" className="space-y-2">
          {(product.endpoints ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No endpoint definitions available.
              </CardContent>
            </Card>
          ) : (
            (product.endpoints ?? []).map((ep, i) => <EndpointRow key={i} endpoint={ep} />)
          )}
        </TabsContent>

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">API Call Volume</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Latency (P95 ms)</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="p95LatencyMs" fill="#f59e0b" name="P95 Latency (ms)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Changelog ───────────────────────────────────────────────────── */}
        <TabsContent value="changelog">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {product.changelog ? (
                <pre className="text-sm whitespace-pre-wrap leading-relaxed">{product.changelog}</pre>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No changelog available for this product.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
