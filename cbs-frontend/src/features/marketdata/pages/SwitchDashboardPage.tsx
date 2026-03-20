import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable } from '@/components/shared';
import {
  useSwitchDashboard,
  useSubscriptionHealth,
  useFeedQualityMetrics,
  useRegisterSwitch,
  useStartSwitch,
  useStopSwitch,
  useAddSubscription,
} from '../hooks/useMarketData';
import type { SubscriptionHealth, FeedQualityMetric } from '../types';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Radio, Activity, Zap, AlertTriangle, Clock, Plus, X, Play, Square, RefreshCw,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { FeedStatusDot } from '../components/FeedStatusDot';

// ── Register Switch Dialog ───────────────────────────────────────────────────

function RegisterSwitchDialog({ onClose }: { onClose: () => void }) {
  const registerSwitch = useRegisterSwitch();
  const [name, setName] = useState('');
  const [type, setType] = useState('STANDARD');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerSwitch.mutate({ name, type }, {
      onSuccess: () => { toast.success('Switch registered'); onClose(); },
      onError: () => toast.error('Failed to register switch'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted" aria-label="Close"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Register Switch</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Switch Name</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Type</label>
            <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="STANDARD">Standard</option>
              <option value="LOW_LATENCY">Low Latency</option>
              <option value="FAILOVER">Failover</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={!name || registerSwitch.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {registerSwitch.isPending ? 'Registering…' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Subscription Dialog ──────────────────────────────────────────────────

function AddSubscriptionDialog({ onClose }: { onClose: () => void }) {
  const addSub = useAddSubscription();
  const [form, setForm] = useState({ switchId: '', provider: '', instrument: '', priority: 1 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSub.mutate(form, {
      onSuccess: () => { toast.success('Subscription added'); onClose(); },
      onError: () => toast.error('Failed to add subscription'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted" aria-label="Close"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Add Subscription</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Switch ID</label>
            <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary" value={form.switchId} onChange={(e) => setForm((f) => ({ ...f, switchId: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Provider</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Instrument</label>
              <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary" value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Priority</label>
            <input type="number" min={1} max={10} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 1 }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={addSub.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {addSub.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Column Definitions ───────────────────────────────────────────────────────

const healthCols: ColumnDef<SubscriptionHealth, unknown>[] = [
  { accessorKey: 'subscriptionId', header: 'Subscription', cell: ({ row }) => <span className="font-mono text-xs">{row.original.subscriptionId}</span> },
  { accessorKey: 'switchId', header: 'Switch', cell: ({ row }) => <span className="font-mono text-xs">{row.original.switchId}</span> },
  { accessorKey: 'provider', header: 'Provider' },
  { accessorKey: 'instrument', header: 'Instrument', cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.instrument}</span> },
  { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <span className="font-mono text-xs">{row.original.priority}</span> },
  {
    accessorKey: 'latencyMs', header: 'Latency',
    cell: ({ row }) => {
      const ms = row.original.latencyMs;
      const color = ms < 100 ? 'text-green-600' : ms < 500 ? 'text-amber-600' : 'text-red-600';
      return <span className={cn('font-mono text-xs font-medium', color)}>{ms}ms</span>;
    },
  },
  {
    accessorKey: 'lastHeartbeatAt', header: 'Last Heartbeat',
    cell: ({ row }) => {
      const hb = row.original.lastHeartbeatAt;
      if (!hb) return '—';
      const ageMs = Date.now() - new Date(hb).getTime();
      const stale = ageMs > 5 * 60 * 1000;
      return <span className={cn('text-xs', stale && 'text-red-600 font-medium')}>{formatDateTime(hb)}</span>;
    },
  },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      const color = s === 'HEALTHY' ? 'bg-green-50 text-green-700' : s === 'DEGRADED' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
      return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', color)} aria-label={`Status: ${s}`}>{s}</span>;
    },
  },
];

const qualityCols: ColumnDef<FeedQualityMetric, unknown>[] = [
  { accessorKey: 'provider', header: 'Provider' },
  { accessorKey: 'assetClass', header: 'Asset Class' },
  {
    accessorKey: 'completeness', header: 'Completeness',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${row.original.completeness}%` }} /></div>
        <span className="font-mono text-xs">{row.original.completeness}%</span>
      </div>
    ),
  },
  {
    accessorKey: 'accuracy', header: 'Accuracy',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${row.original.accuracy}%` }} /></div>
        <span className="font-mono text-xs">{row.original.accuracy}%</span>
      </div>
    ),
  },
  {
    accessorKey: 'timeliness', header: 'Timeliness',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.original.timeliness}%` }} /></div>
        <span className="font-mono text-xs">{row.original.timeliness}%</span>
      </div>
    ),
  },
  {
    accessorKey: 'errorCount', header: 'Errors',
    cell: ({ row }) => <span className={cn('font-mono text-xs', row.original.errorCount > 10 ? 'text-red-600 font-medium' : row.original.errorCount > 5 ? 'text-amber-600' : '')}>{row.original.errorCount}</span>,
  },
  {
    accessorKey: 'overallScore', header: 'Score',
    cell: ({ row }) => {
      const s = row.original.overallScore;
      const color = s >= 90 ? 'text-green-600' : s >= 70 ? 'text-amber-600' : 'text-red-600';
      return <span className={cn('font-semibold font-mono text-sm', color)}>{s}</span>;
    },
  },
];

// ── Main Page ────────────────────────────────────────────────────────────────

export function SwitchDashboardPage() {
  useEffect(() => { document.title = 'Switch Dashboard | CBS'; }, []);

  const { data: dashboard, isLoading: dashLoading, isError: dashError, isFetching, refetch } = useSwitchDashboard();
  const { data: health = [], isLoading: healthLoading } = useSubscriptionHealth();
  const { data: quality = [], isLoading: qualityLoading } = useFeedQualityMetrics();

  const [showRegister, setShowRegister] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);

  const connectionStatus = dashError ? 'disconnected' : isFetching ? 'updating' : 'live';

  // Client-side alerts
  const alerts: { severity: 'error' | 'warning'; message: string }[] = [];
  const downSubs = health.filter((h) => h.status === 'FAILED');
  if (downSubs.length > 0) alerts.push({ severity: 'error', message: `${downSubs.length} subscription(s) DOWN` });
  if (dashboard && dashboard.errorRate > 1) alerts.push({ severity: 'error', message: `Error rate ${dashboard.errorRate.toFixed(2)}% exceeds 1% threshold` });
  const highLatency = health.filter((h) => h.latencyMs > 500);
  if (highLatency.length > 0) alerts.push({ severity: 'warning', message: `${highLatency.length} subscription(s) with latency >500ms` });

  return (
    <>
      <PageHeader
        title="Market Data Switch"
        subtitle="Infrastructure health and subscription monitoring"
        backTo="/market-data"
        actions={
          <div className="flex items-center gap-3">
            <span className={cn('flex items-center gap-1.5 text-xs font-medium',
              connectionStatus === 'live' ? 'text-green-600' : connectionStatus === 'updating' ? 'text-amber-600' : 'text-red-600',
            )} aria-live="polite">
              <span className={cn('w-2 h-2 rounded-full', connectionStatus === 'live' ? 'bg-green-500 animate-pulse' : connectionStatus === 'updating' ? 'bg-amber-500' : 'bg-red-500')} />
              {connectionStatus === 'live' ? 'Live' : connectionStatus === 'updating' ? 'Updating…' : 'Disconnected'}
            </span>
            <button onClick={() => setShowRegister(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
              <Plus className="w-3.5 h-3.5" /> Register Switch
            </button>
            <button onClick={() => setShowAddSub(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> Add Subscription
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {dashError && (
          <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-400">Failed to load switch dashboard.</p>
            </div>
            <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Feeds" value={dashboard?.totalFeeds ?? 0} format="number" icon={Radio} loading={dashLoading} />
          <StatCard label="Active Feeds" value={dashboard?.activeFeeds ?? 0} format="number" icon={Activity} loading={dashLoading} />
          <StatCard label="Messages/sec" value={dashboard?.messagesPerSec ?? 0} icon={Zap} loading={dashLoading} />
          <StatCard label="Error Rate" value={dashboard?.errorRate ?? 0} format="percent" icon={AlertTriangle} loading={dashLoading} />
          <StatCard label="Uptime" value={dashboard?.uptimePct ?? 0} format="percent" icon={Clock} loading={dashLoading} />
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={cn('rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm',
                alert.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
              )}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Subscription Health */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Subscription Health</h3>
          <DataTable columns={healthCols} data={health} isLoading={healthLoading} enableGlobalFilter enableExport exportFilename="subscription-health" emptyMessage="No subscriptions registered" pageSize={15} />
        </div>

        {/* Feed Quality */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Feed Quality Metrics</h3>
          <DataTable columns={qualityCols} data={quality} isLoading={qualityLoading} enableGlobalFilter enableExport exportFilename="feed-quality" emptyMessage="No quality metrics available" />
        </div>
      </div>

      {showRegister && <RegisterSwitchDialog onClose={() => setShowRegister(false)} />}
      {showAddSub && <AddSubscriptionDialog onClose={() => setShowAddSub(false)} />}
    </>
  );
}
