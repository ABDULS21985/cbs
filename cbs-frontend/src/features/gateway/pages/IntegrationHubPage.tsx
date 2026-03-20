import { useState, useEffect, useMemo } from 'react';
import {
  GitBranch, Heart, HeartOff, Inbox, Plus, RefreshCw, X, Loader2,
  ArrowRight, Copy, Zap, AlertTriangle, CheckCircle, Clock,
  Send, Shield, Key, Globe, Code, Activity, Server,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage, EmptyState } from '@/components/shared';
import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  GATEWAY_KEYS,
  useIntegrationRoutes,
  useCreateRoute,
  useRouteHealthCheck,
  useRetryDeadLetters,
  useDlqCount,
  useSendIntegrationMessage,
} from '../hooks/useGatewayData';
import { integrationApi } from '../api/integrationApi';
import type { IntegrationRoute, IntegrationMessage } from '../types/integration';
import { useQuery } from '@tanstack/react-query';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROTOCOL_COLORS: Record<string, string> = {
  HTTP: 'bg-blue-100 text-blue-700', HTTPS: 'bg-green-100 text-green-700',
  JMS: 'bg-purple-100 text-purple-700', KAFKA: 'bg-orange-100 text-orange-700', Kafka: 'bg-orange-100 text-orange-700',
  SFTP: 'bg-teal-100 text-teal-700', AMQP: 'bg-pink-100 text-pink-700',
  SMTP: 'bg-amber-100 text-amber-700', GRPC: 'bg-indigo-100 text-indigo-700',
};

const AUTH_COLORS: Record<string, string> = {
  CERTIFICATE: 'bg-blue-100 text-blue-700', OAUTH: 'bg-purple-100 text-purple-700',
  API_KEY: 'bg-amber-100 text-amber-700', BASIC: 'bg-gray-100 text-gray-700',
  NONE: 'bg-gray-50 text-gray-500',
};

const STATUS_PIPELINE: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-700', VALIDATING: 'bg-blue-100 text-blue-700',
  TRANSFORMING: 'bg-purple-100 text-purple-700', ROUTING: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-green-100 text-green-700', FAILED: 'bg-red-100 text-red-700',
  DEAD_LETTER: 'bg-red-200 text-red-800',
};

const HEALTH_DOT: Record<string, string> = {
  HEALTHY: 'bg-green-500 animate-pulse', DOWN: 'bg-red-500 animate-pulse', UNKNOWN: 'bg-gray-400',
};

// ─── Route Health Card ──────────────────────────────────────────────────────

function RouteHealthCard({ route, onCheckHealth }: { route: IntegrationRoute; onCheckHealth: (code: string) => void }) {
  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', HEALTH_DOT[route.healthStatus] ?? 'bg-gray-400')} />
          <span className="text-sm font-semibold truncate">{route.routeName}</span>
        </div>
        <button onClick={() => onCheckHealth(route.routeCode)} className="text-[10px] text-primary hover:underline font-medium flex-shrink-0">Check</button>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {route.sourceSystem} <ArrowRight className="w-3 h-3" /> {route.targetSystem}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', PROTOCOL_COLORS[route.protocol] ?? 'bg-gray-100 text-gray-700')}>{route.protocol}</span>
        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold', AUTH_COLORS[route.authType] ?? 'bg-gray-100')}>{route.authType}</span>
      </div>
      <p className="text-[10px] text-muted-foreground">{route.lastHealthCheck ? formatRelative(route.lastHealthCheck) : 'Never checked'}</p>
    </div>
  );
}

// ─── Create Route Dialog ────────────────────────────────────────────────────

function CreateRouteDialog({ onClose }: { onClose: () => void }) {
  const createRoute = useCreateRoute();
  const fc = 'w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 border-border';
  const [form, setForm] = useState({
    routeCode: '', routeName: '', routeType: 'HTTP', sourceSystem: '', targetSystem: '',
    protocol: 'HTTPS', endpointUrl: '', authType: 'NONE',
    rateLimitPerSec: 100, timeoutMs: 30000,
    maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2,
    failureThreshold: 5, resetTimeoutMs: 30000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoute.mutate({
      routeCode: form.routeCode, routeName: form.routeName, routeType: form.routeType,
      sourceSystem: form.sourceSystem, targetSystem: form.targetSystem,
      protocol: form.protocol, endpointUrl: form.endpointUrl, authType: form.authType,
      rateLimitPerSec: form.rateLimitPerSec, timeoutMs: form.timeoutMs,
      retryPolicy: { maxRetries: form.maxRetries, backoffMs: form.backoffMs, backoffMultiplier: form.backoffMultiplier },
      circuitBreaker: { failureThreshold: form.failureThreshold, resetTimeoutMs: form.resetTimeoutMs },
    } as Partial<IntegrationRoute>, {
      onSuccess: () => { toast.success('Route created'); onClose(); },
      onError: () => toast.error('Failed to create route'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">New Integration Route</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Route Code *</label><input className={cn(fc, 'font-mono uppercase mt-1')} value={form.routeCode} onChange={(e) => setForm((f) => ({ ...f, routeCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Route Name *</label><input className={cn(fc, 'mt-1')} value={form.routeName} onChange={(e) => setForm((f) => ({ ...f, routeName: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Type</label><select className={cn(fc, 'mt-1')} value={form.routeType} onChange={(e) => setForm((f) => ({ ...f, routeType: e.target.value }))}>
              {['HTTP', 'JMS', 'KAFKA', 'SFTP', 'AMQP', 'SMTP', 'GRPC'].map((t) => <option key={t}>{t}</option>)}
            </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Source *</label><input className={cn(fc, 'mt-1')} value={form.sourceSystem} onChange={(e) => setForm((f) => ({ ...f, sourceSystem: e.target.value }))} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Target *</label><input className={cn(fc, 'mt-1')} value={form.targetSystem} onChange={(e) => setForm((f) => ({ ...f, targetSystem: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Protocol</label><select className={cn(fc, 'mt-1')} value={form.protocol} onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value }))}>
              {['HTTP', 'HTTPS', 'JMS', 'Kafka', 'SFTP', 'AMQP'].map((p) => <option key={p}>{p}</option>)}
            </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Auth Type</label><select className={cn(fc, 'mt-1')} value={form.authType} onChange={(e) => setForm((f) => ({ ...f, authType: e.target.value }))}>
              {['NONE', 'CERTIFICATE', 'OAUTH', 'API_KEY', 'BASIC'].map((a) => <option key={a}>{a}</option>)}
            </select></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Endpoint URL</label><input className={cn(fc, 'mt-1 font-mono text-xs')} placeholder="https://api.partner.com/v1" value={form.endpointUrl} onChange={(e) => setForm((f) => ({ ...f, endpointUrl: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Rate Limit (/sec)</label><input type="number" className={cn(fc, 'mt-1')} value={form.rateLimitPerSec} onChange={(e) => setForm((f) => ({ ...f, rateLimitPerSec: parseInt(e.target.value) || 100 }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Timeout (ms)</label><input type="number" className={cn(fc, 'mt-1')} value={form.timeoutMs} onChange={(e) => setForm((f) => ({ ...f, timeoutMs: parseInt(e.target.value) || 30000 }))} /></div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Retry Policy</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-muted-foreground">Max Retries</label><input type="number" className={cn(fc, 'mt-1')} value={form.maxRetries} onChange={(e) => setForm((f) => ({ ...f, maxRetries: parseInt(e.target.value) || 3 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Backoff (ms)</label><input type="number" className={cn(fc, 'mt-1')} value={form.backoffMs} onChange={(e) => setForm((f) => ({ ...f, backoffMs: parseInt(e.target.value) || 1000 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Multiplier</label><input type="number" step="0.5" className={cn(fc, 'mt-1')} value={form.backoffMultiplier} onChange={(e) => setForm((f) => ({ ...f, backoffMultiplier: parseFloat(e.target.value) || 2 }))} /></div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Circuit Breaker</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Failure Threshold</label><input type="number" className={cn(fc, 'mt-1')} value={form.failureThreshold} onChange={(e) => setForm((f) => ({ ...f, failureThreshold: parseInt(e.target.value) || 5 }))} /></div>
            <div><label className="text-xs text-muted-foreground">Reset Timeout (ms)</label><input type="number" className={cn(fc, 'mt-1')} value={form.resetTimeoutMs} onChange={(e) => setForm((f) => ({ ...f, resetTimeoutMs: parseInt(e.target.value) || 30000 }))} /></div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={!form.routeCode || !form.routeName || createRoute.isPending} className="btn-primary flex items-center gap-2">
              {createRoute.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {createRoute.isPending ? 'Creating...' : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Send Message Dialog ────────────────────────────────────────────────────

function SendMessageDialog({ routes, onClose }: { routes: IntegrationRoute[]; onClose: () => void }) {
  const sendMessage = useSendIntegrationMessage();
  const [form, setForm] = useState({ routeId: routes[0]?.id ?? 0, messageType: '', contentType: 'application/json', payload: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Send Message</h2>
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-muted-foreground">Route</label>
            <select className="w-full mt-1 input" value={form.routeId} onChange={(e) => setForm((f) => ({ ...f, routeId: parseInt(e.target.value) }))}>
              {routes.filter((r) => r.isActive).map((r) => <option key={r.id} value={r.id}>{r.routeName} ({r.routeCode})</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-muted-foreground">Message Type</label>
            <input className="w-full mt-1 input" value={form.messageType} onChange={(e) => setForm((f) => ({ ...f, messageType: e.target.value }))} required /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Content Type</label>
            <select className="w-full mt-1 input" value={form.contentType} onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))}>
              <option>application/json</option><option>application/xml</option><option>text/plain</option>
            </select></div>
          <div><label className="text-xs font-medium text-muted-foreground">Payload</label>
            <textarea className="w-full mt-1 input h-32 resize-y font-mono text-xs" value={form.payload} onChange={(e) => setForm((f) => ({ ...f, payload: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => sendMessage.mutate(form as Record<string, unknown>, { onSuccess: () => { toast.success('Message sent'); onClose(); }, onError: () => toast.error('Failed') })}
              disabled={!form.messageType || sendMessage.isPending} className="btn-primary flex items-center gap-2">
              {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function IntegrationHubPage() {
  useEffect(() => { document.title = 'Integration Hub | CBS'; }, []);

  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);

  const { data: routes = [], isLoading: routesLoading } = useIntegrationRoutes();
  const { data: dlqCountData } = useDlqCount();
  const healthCheck = useRouteHealthCheck();
  const retryAll = useRetryDeadLetters();

  // Fetch messages and DLQ items
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: GATEWAY_KEYS.messages(),
    queryFn: () => integrationApi.listMessages(),
    staleTime: 30_000,
  });

  const dlqCount = typeof dlqCountData === 'object' && dlqCountData ? (dlqCountData as Record<string, number>).count ?? 0 : 0;
  const healthyRoutes = routes.filter((r) => r.healthStatus === 'HEALTHY');
  const downRoutes = routes.filter((r) => r.healthStatus === 'DOWN');

  const handleHealthCheck = (routeCode: string) => {
    healthCheck.mutate(routeCode, {
      onSuccess: () => toast.success(`Health check for ${routeCode} completed`),
      onError: () => toast.error('Health check failed'),
    });
  };

  const handleRetryAll = () => {
    retryAll.mutate(undefined, {
      onSuccess: () => toast.success('DLQ retry initiated'),
      onError: () => toast.error('Retry failed'),
    });
  };

  // Route columns
  const routeCols: ColumnDef<IntegrationRoute, unknown>[] = [
    { accessorKey: 'routeCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.routeCode}</span> },
    { accessorKey: 'routeName', header: 'Name', cell: ({ row }) => <span className="font-semibold text-sm">{row.original.routeName}</span> },
    { accessorKey: 'routeType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.routeType} /> },
    {
      id: 'flow', header: 'Flow',
      cell: ({ row }) => <span className="text-xs flex items-center gap-1">{row.original.sourceSystem} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {row.original.targetSystem}</span>,
    },
    { accessorKey: 'protocol', header: 'Protocol', cell: ({ row }) => <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', PROTOCOL_COLORS[row.original.protocol] ?? 'bg-gray-100')}>{row.original.protocol}</span> },
    {
      accessorKey: 'endpointUrl', header: 'Endpoint',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 max-w-[180px]">
          <span className="text-xs font-mono truncate">{row.original.endpointUrl || '—'}</span>
          {row.original.endpointUrl && (
            <button onClick={() => { navigator.clipboard.writeText(row.original.endpointUrl); toast.success('Copied'); }} className="flex-shrink-0"><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
          )}
        </div>
      ),
    },
    { accessorKey: 'authType', header: 'Auth', cell: ({ row }) => <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', AUTH_COLORS[row.original.authType] ?? 'bg-gray-100')}>{row.original.authType}</span> },
    { accessorKey: 'rateLimitPerSec', header: 'Rate/s', cell: ({ row }) => <span className="text-xs font-mono">{row.original.rateLimitPerSec}</span> },
    { accessorKey: 'timeoutMs', header: 'Timeout', cell: ({ row }) => <span className="text-xs font-mono">{row.original.timeoutMs}ms</span> },
    {
      accessorKey: 'healthStatus', header: 'Health',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-xs">
          <span className={cn('w-2 h-2 rounded-full', HEALTH_DOT[row.original.healthStatus] ?? 'bg-gray-400')} />
          {row.original.healthStatus}
        </span>
      ),
    },
    {
      accessorKey: 'lastHealthCheck', header: 'Last Check',
      cell: ({ row }) => {
        const age = row.original.lastHealthCheck ? (Date.now() - new Date(row.original.lastHealthCheck).getTime()) / 3600000 : Infinity;
        return <span className={cn('text-xs', age > 1 ? 'text-red-600 font-medium' : 'text-muted-foreground')}>{row.original.lastHealthCheck ? formatRelative(row.original.lastHealthCheck) : '—'}</span>;
      },
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button onClick={() => handleHealthCheck(row.original.routeCode)} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
          <Activity className="w-3 h-3" /> Check
        </button>
      ),
    },
  ];

  // Message columns
  const messageCols: ColumnDef<IntegrationMessage, unknown>[] = [
    { accessorKey: 'messageId', header: 'ID', cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.messageId}</span> },
    { accessorKey: 'routeId', header: 'Route', cell: ({ row }) => <span className="text-xs font-mono">#{row.original.routeId}</span> },
    { accessorKey: 'correlationId', header: 'Correlation', cell: ({ row }) => <span className="font-mono text-[10px] truncate max-w-[100px] block">{row.original.correlationId}</span> },
    {
      accessorKey: 'direction', header: 'Dir',
      cell: ({ row }) => <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', row.original.direction === 'INBOUND' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>{row.original.direction}</span>,
    },
    { accessorKey: 'messageType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.messageType}</span> },
    { accessorKey: 'payloadSizeBytes', header: 'Size', cell: ({ row }) => <span className="text-xs font-mono">{row.original.payloadSizeBytes > 1024 ? `${(row.original.payloadSizeBytes / 1024).toFixed(1)}KB` : `${row.original.payloadSizeBytes}B`}</span> },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_PIPELINE[row.original.status] ?? 'bg-gray-100')}>{row.original.status}</span>,
    },
    { accessorKey: 'retryCount', header: 'Retries', cell: ({ row }) => <span className="text-xs font-mono">{row.original.retryCount}</span> },
    { accessorKey: 'processingTimeMs', header: 'Time', cell: ({ row }) => <span className="text-xs font-mono">{row.original.processingTimeMs}ms</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
  ];

  // Circuit breaker data from routes
  const circuitBreakerData = useMemo(() => routes.map((r) => {
    const cb = r.circuitBreaker as Record<string, unknown> | undefined;
    return {
      routeName: r.routeName,
      routeCode: r.routeCode,
      status: r.healthStatus === 'DOWN' ? 'OPEN' : r.healthStatus === 'HEALTHY' ? 'CLOSED' : 'HALF_OPEN',
      failureThreshold: cb?.failureThreshold as number ?? 5,
      resetTimeoutMs: cb?.resetTimeoutMs as number ?? 30000,
      healthStatus: r.healthStatus,
    };
  }), [routes]);

  const tabs = [
    {
      id: 'routes',
      label: 'Routes',
      badge: routes.length || undefined,
      content: (
        <div className="p-4 space-y-3">
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowSendMessage(true)} disabled={routes.filter((r) => r.isActive).length === 0} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> Send Message
            </button>
            <button onClick={() => setShowCreateRoute(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> New Route
            </button>
          </div>
          <DataTable columns={routeCols} data={routes} isLoading={routesLoading} enableGlobalFilter enableExport exportFilename="integration-routes" emptyMessage="No routes configured" />
        </div>
      ),
    },
    {
      id: 'messages',
      label: 'Messages',
      content: (
        <div className="p-4">
          <DataTable columns={messageCols} data={messages} isLoading={messagesLoading} enableGlobalFilter emptyMessage="No integration messages found" />
        </div>
      ),
    },
    {
      id: 'dlq',
      label: 'Dead Letter Queue',
      badge: dlqCount > 0 ? dlqCount : undefined,
      content: (
        <div className="p-4 space-y-4">
          {dlqCount > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-900/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{dlqCount} message(s) in dead letter queue</p>
              </div>
              <button onClick={handleRetryAll} disabled={retryAll.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                {retryAll.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Retry All
              </button>
            </div>
          )}
          <EmptyState
            icon={Inbox}
            title="DLQ item listing unavailable"
            description="The backend currently exposes DLQ count and retry actions, but not a detailed DLQ list endpoint for this page."
          />
        </div>
      ),
    },
    {
      id: 'health',
      label: 'Health Dashboard',
      content: (
        <div className="p-4 space-y-6">
          {/* Overall health */}
          <div className={cn('rounded-xl border p-6 text-center', downRoutes.length === 0 ? 'border-green-200 bg-green-50/30 dark:bg-green-900/5' : 'border-red-200 bg-red-50/30 dark:bg-red-900/5')}>
            <p className={cn('text-4xl font-bold', downRoutes.length === 0 ? 'text-green-600' : 'text-red-600')}>
              {healthyRoutes.length}/{routes.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">routes healthy</p>
          </div>

          {/* Unhealthy routes */}
          {downRoutes.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-card p-5">
              <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Unhealthy Routes</h3>
              <div className="space-y-2">
                {downRoutes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30">
                    <div>
                      <p className="text-sm font-medium">{r.routeName}</p>
                      <p className="text-xs text-muted-foreground">{r.sourceSystem} → {r.targetSystem}</p>
                    </div>
                    <button onClick={() => handleHealthCheck(r.routeCode)} className="text-xs text-primary hover:underline">Recheck</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Circuit breaker status */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Circuit Breaker Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Route</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Threshold</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Reset</th>
                </tr></thead>
                <tbody className="divide-y">
                  {circuitBreakerData.map((cb) => (
                    <tr key={cb.routeCode}>
                      <td className="py-2 px-3 text-xs font-medium">{cb.routeName}</td>
                      <td className="py-2 px-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                          cb.status === 'CLOSED' ? 'bg-green-100 text-green-700' : cb.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                          {cb.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs font-mono">{cb.failureThreshold}</td>
                      <td className="py-2 px-3 text-xs font-mono">{cb.resetTimeoutMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showCreateRoute && <CreateRouteDialog onClose={() => setShowCreateRoute(false)} />}
      {showSendMessage && <SendMessageDialog routes={routes} onClose={() => setShowSendMessage(false)} />}

      <PageHeader
        title="Integration Hub"
        subtitle="ESB route management, message processing, and dead letter queue"
        actions={
          <div className="flex items-center gap-2">
            {dlqCount > 0 && (
              <button onClick={handleRetryAll} disabled={retryAll.isPending} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10">
                <RefreshCw className={cn('w-4 h-4', retryAll.isPending && 'animate-spin')} />
                Retry DLQ
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{dlqCount}</span>
              </button>
            )}
            <button onClick={() => setShowCreateRoute(true)} className="flex items-center gap-2 btn-primary">
              <Plus className="w-4 h-4" /> New Route
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Routes" value={routes.length} format="number" icon={GitBranch} loading={routesLoading} />
          <StatCard label="Healthy" value={healthyRoutes.length} format="number" icon={Heart} loading={routesLoading} />
          <StatCard label="Down" value={downRoutes.length} format="number" icon={HeartOff} loading={routesLoading} />
          <StatCard label="DLQ Pending" value={dlqCount} format="number" icon={Inbox} loading={routesLoading} />
        </div>

        {/* Route health map */}
        {routes.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Route Health Map</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {routes.map((r) => <RouteHealthCard key={r.id} route={r} onCheckHealth={handleHealthCheck} />)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
