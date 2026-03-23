import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage } from '@/components/shared';
import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Radio, Activity, Zap, AlertTriangle, Clock, Plus, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useSwitchDashboard, useSubscriptionHealth, useFeedQualityMetrics,
  useRegisterSwitch, useStartSwitch, useStopSwitch, useAddSubscription,
} from '../hooks/useMarketData';
import type { SubscriptionHealth, FeedQualityMetric } from '../types';

const LATENCY_COLOR = (ms: number) => ms < 100 ? 'text-green-600' : ms < 500 ? 'text-amber-600' : 'text-red-600';
const STATUS_COLOR: Record<string, string> = { HEALTHY: 'bg-green-100 text-green-700', DEGRADED: 'bg-amber-100 text-amber-700', FAILED: 'bg-red-100 text-red-700', DOWN: 'bg-red-100 text-red-700' };

function MetricBar({ value }: { value: number }) {
  const color = value >= 90 ? 'bg-green-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(value, 100)}%` }} /></div>
      <span className="text-xs tabular-nums font-mono">{value.toFixed(0)}%</span>
    </div>
  );
}

export function SwitchDashboardPage() {
  useEffect(() => { document.title = 'Market Data Switch | CBS'; }, []);
  const [showRegister, setShowRegister] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', type: 'AGGREGATOR' });
  const [subForm, setSubForm] = useState({ switchId: '', provider: '', instrument: '', priority: 1 });

  const { data: dashboard, isLoading: dashLoading, isError: dashError, refetch: refetchDash, isFetching } = useSwitchDashboard();
  const { data: subscriptions = [], isLoading: subsLoading } = useSubscriptionHealth();
  const { data: metrics = [], isLoading: metricsLoading } = useFeedQualityMetrics();
  const registerSwitch = useRegisterSwitch();
  const addSubscription = useAddSubscription();

  const alerts = useMemo(() => {
    const a: { severity: 'HIGH' | 'MEDIUM'; message: string }[] = [];
    subscriptions.filter((s) => s.status === 'FAILED' || s.status === 'DOWN').forEach((s) => a.push({ severity: 'HIGH', message: `Feed ${s.provider}/${s.instrument} is DOWN` }));
    if (dashboard && dashboard.errorRate > 1) a.push({ severity: 'HIGH', message: `Error rate: ${dashboard.errorRate.toFixed(2)}%` });
    subscriptions.filter((s) => s.latencyMs > 400).forEach((s) => a.push({ severity: 'MEDIUM', message: `Latency spike on ${s.provider}: ${s.latencyMs}ms` }));
    return a;
  }, [subscriptions, dashboard]);

  const subCols: ColumnDef<SubscriptionHealth, unknown>[] = [
    { accessorKey: 'subscriptionId', header: 'ID', cell: ({ row }) => <code className="text-xs font-mono">{row.original.subscriptionId}</code> },
    { accessorKey: 'switchId', header: 'Switch' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'instrument', header: 'Instrument' },
    { accessorKey: 'priority', header: 'Pri' },
    { accessorKey: 'latencyMs', header: 'Latency', cell: ({ row }) => <span className={cn('font-mono text-xs font-medium', LATENCY_COLOR(row.original.latencyMs))}>{row.original.latencyMs}ms</span> },
    { accessorKey: 'lastHeartbeatAt', header: 'Heartbeat', cell: ({ row }) => {
      const ago = (Date.now() - new Date(row.original.lastHeartbeatAt).getTime()) / 60000;
      return <span className={cn('text-xs', ago > 5 ? 'text-red-600 font-medium' : 'text-muted-foreground')}>{formatRelative(row.original.lastHeartbeatAt)}</span>;
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLOR[row.original.status] ?? 'bg-muted')}>{row.original.status}</span> },
  ];

  const qualCols: ColumnDef<FeedQualityMetric, unknown>[] = [
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'assetClass', header: 'Asset Class' },
    { accessorKey: 'completeness', header: 'Complete', cell: ({ row }) => <MetricBar value={row.original.completeness} /> },
    { accessorKey: 'accuracy', header: 'Accuracy', cell: ({ row }) => <MetricBar value={row.original.accuracy} /> },
    { accessorKey: 'timeliness', header: 'Timeliness', cell: ({ row }) => <MetricBar value={row.original.timeliness} /> },
    { accessorKey: 'errorCount', header: 'Errors', cell: ({ row }) => <span className={cn('font-mono text-xs', row.original.errorCount > 10 ? 'text-red-600 font-bold' : row.original.errorCount > 5 ? 'text-amber-600' : '')}>{row.original.errorCount}</span> },
    { accessorKey: 'overallScore', header: 'Score', cell: ({ row }) => <span className={cn('font-mono text-sm font-bold', row.original.overallScore >= 90 ? 'text-green-600' : row.original.overallScore >= 70 ? 'text-amber-600' : 'text-red-600')}>{row.original.overallScore}</span> },
  ];

  const sortedSubs = [...subscriptions].sort((a, b) => {
    const ord = { FAILED: 0, DOWN: 0, DEGRADED: 1, HEALTHY: 2 };
    const sa = ord[a.status as keyof typeof ord] ?? 2;
    const sb = ord[b.status as keyof typeof ord] ?? 2;
    return sa !== sb ? sa - sb : b.latencyMs - a.latencyMs;
  });

  const tabs = [
    { id: 'health', label: 'Subscription Health', badge: subscriptions.filter((s) => s.status !== 'HEALTHY').length || undefined,
      content: <div className="p-4"><DataTable columns={subCols} data={sortedSubs} isLoading={subsLoading} enableGlobalFilter emptyMessage="No subscriptions" /></div> },
    { id: 'quality', label: 'Feed Quality',
      content: <div className="p-4"><DataTable columns={qualCols} data={metrics} isLoading={metricsLoading} enableGlobalFilter enableExport exportFilename="feed-quality" emptyMessage="No metrics" /></div> },
  ];

  return (
    <>
      <PageHeader title="Market Data Switch" subtitle="Infrastructure health and subscription monitoring"
        actions={
          <div className="flex items-center gap-2">
            <span className={cn('flex items-center gap-1.5 text-xs font-medium', isFetching ? 'text-amber-600' : dashError ? 'text-red-600' : 'text-green-600')}>
              <span className={cn('w-2 h-2 rounded-full', isFetching ? 'bg-amber-500' : dashError ? 'bg-red-500' : 'bg-green-500 animate-pulse')} />
              {isFetching ? 'Updating...' : dashError ? 'Error' : 'Live'}
            </span>
            <button onClick={() => setShowRegister(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted"><Plus className="w-4 h-4" /> Register Switch</button>
            <button onClick={() => setShowSub(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Add Subscription</button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total Feeds" value={dashboard?.totalFeeds ?? 0} format="number" icon={Radio} loading={dashLoading} />
          <StatCard label="Active Feeds" value={dashboard?.activeFeeds ?? 0} format="number" icon={Activity} loading={dashLoading} />
          <StatCard label="Messages/sec" value={dashboard?.messagesPerSec?.toLocaleString() ?? '—'} icon={Zap} loading={dashLoading} />
          <StatCard label="Error Rate" value={dashboard ? `${dashboard.errorRate.toFixed(2)}%` : '—'} icon={AlertTriangle} loading={dashLoading} />
          <StatCard label="Uptime" value={dashboard?.uptimePct ? `${dashboard.uptimePct.toFixed(1)}%` : '—'} icon={Clock} loading={dashLoading} />
        </div>

        {dashError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><p className="text-sm text-red-700">Failed to load dashboard.</p></div>
            <button onClick={() => refetchDash()} className="text-xs text-primary hover:underline">Retry</button>
          </div>
        )}

        <div className="card overflow-hidden"><TabsPage syncWithUrl tabs={tabs} /></div>

        {alerts.length > 0 && (
          <div className="surface-card p-5 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Alerts ({alerts.length})</h3>
            {alerts.map((a, i) => (
              <div key={i} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs', a.severity === 'HIGH' ? 'bg-red-50 text-red-700 dark:bg-red-900/10' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/10')}>
                <span className={cn('w-2 h-2 rounded-full', a.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-500')} />{a.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRegister && (
        <><div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRegister(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Register Switch</h3>
              <div><label className="text-xs font-medium text-muted-foreground">Name</label><input value={regForm.name} onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Type</label><select value={regForm.type} onChange={(e) => setRegForm((f) => ({ ...f, type: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                {['AGGREGATOR', 'DIRECT', 'GATEWAY', 'BACKUP'].map((t) => <option key={t}>{t}</option>)}
              </select></div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowRegister(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => registerSwitch.mutate(regForm, { onSuccess: () => { toast.success('Registered'); setShowRegister(false); }, onError: () => toast.error('Failed') })}
                  disabled={registerSwitch.isPending || !regForm.name} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Register</button>
              </div>
            </div>
          </div></>
      )}

      {showSub && (
        <><div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSub(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Add Subscription</h3>
              <div><label className="text-xs font-medium text-muted-foreground">Switch ID</label><input value={subForm.switchId} onChange={(e) => setSubForm((f) => ({ ...f, switchId: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Provider</label><input value={subForm.provider} onChange={(e) => setSubForm((f) => ({ ...f, provider: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Instrument</label><input value={subForm.instrument} onChange={(e) => setSubForm((f) => ({ ...f, instrument: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Priority</label><input type="number" value={subForm.priority} onChange={(e) => setSubForm((f) => ({ ...f, priority: Number(e.target.value) }))} min={1} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowSub(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => addSubscription.mutate(subForm, { onSuccess: () => { toast.success('Added'); setShowSub(false); }, onError: () => toast.error('Failed') })}
                  disabled={addSubscription.isPending || !subForm.switchId || !subForm.provider} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">Add</button>
              </div>
            </div>
          </div></>
      )}
    </>
  );
}
