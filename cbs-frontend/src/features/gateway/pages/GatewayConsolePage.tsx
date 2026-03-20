import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage, EmptyState } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatRelative, formatMoneyCompact } from '@/lib/formatters';
import {
  Plus, Send, AlertOctagon, Wifi, WifiOff, AlertTriangle,
  RotateCw, X, Shield, Clock, BarChart3, Activity,
  FileText, Ban, CheckCircle, XCircle,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { GatewayLiveStats } from '../components/GatewayLiveStats';
import { ThroughputChart } from '../components/ThroughputChart';
import { MessageQueueTable } from '../components/MessageQueueTable';
import { FailedRetryTable } from '../components/FailedRetryTable';
import { GatewayStatusGrid } from '../components/GatewayStatusGrid';
import { SwiftMessageSearch } from '../components/SwiftMessageSearch';
import { gatewayApi, type GatewayMessage, type GatewayStatus, type ThroughputPoint } from '../api/gatewayApi';
import { financialGatewayApi } from '../api/financialGatewayApi';
import type { FinancialGateway } from '../types/financialGateway';
import { toast } from 'sonner';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ── Register Gateway Dialog ──────────────────────────────────────────────────

function RegisterGatewayDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const register = useMutation({
    mutationFn: (data: Partial<FinancialGateway>) => financialGatewayApi.register(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gateway'] }); toast.success('Gateway registered'); onClose(); },
  });
  const [form, setForm] = useState({
    gatewayCode: '', gatewayName: '', gatewayType: 'SWIFT', protocol: 'SWIFT_FIN',
    bicCode: '', endpointUrl: '', authMethod: 'CERTIFICATE', encryptionStandard: 'TLS_1_3',
    primaryConnection: '', backupConnection: '', dailyVolumeLimit: 10000, dailyValueLimit: 0,
  });
  const update = (f: string, v: unknown) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Register Gateway</h2>
        <form onSubmit={(e) => { e.preventDefault(); register.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Gateway Code *</label><input className="w-full mt-1 input" value={form.gatewayCode} onChange={(e) => update('gatewayCode', e.target.value)} required /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Gateway Name *</label><input className="w-full mt-1 input" value={form.gatewayName} onChange={(e) => update('gatewayName', e.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Type</label><select className="w-full mt-1 input" value={form.gatewayType} onChange={(e) => update('gatewayType', e.target.value)}>{['SWIFT','SEPA','RTGS','NIP','ACH','DOMESTIC','CROSS_BORDER'].map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="text-sm font-medium text-muted-foreground">Protocol</label><select className="w-full mt-1 input" value={form.protocol} onChange={(e) => update('protocol', e.target.value)}>{['SWIFT_FIN','SWIFT_MX','HTTP','HTTPS','SFTP','MQ'].map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">BIC Code</label><input className="w-full mt-1 input" value={form.bicCode} onChange={(e) => update('bicCode', e.target.value)} /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Endpoint URL *</label><input className="w-full mt-1 input" value={form.endpointUrl} onChange={(e) => update('endpointUrl', e.target.value)} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Auth Method</label><select className="w-full mt-1 input" value={form.authMethod} onChange={(e) => update('authMethod', e.target.value)}>{['CERTIFICATE','OAUTH','API_KEY','NONE'].map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="text-sm font-medium text-muted-foreground">Encryption</label><select className="w-full mt-1 input" value={form.encryptionStandard} onChange={(e) => update('encryptionStandard', e.target.value)}>{['TLS_1_2','TLS_1_3','AES_256'].map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Primary Connection</label><input className="w-full mt-1 input" value={form.primaryConnection} onChange={(e) => update('primaryConnection', e.target.value)} /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Backup Connection</label><input className="w-full mt-1 input" value={form.backupConnection} onChange={(e) => update('backupConnection', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Daily Volume Limit</label><input type="number" className="w-full mt-1 input" value={form.dailyVolumeLimit} onChange={(e) => update('dailyVolumeLimit', parseInt(e.target.value) || 0)} /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Daily Value Limit</label><input type="number" className="w-full mt-1 input" value={form.dailyValueLimit} onChange={(e) => update('dailyValueLimit', parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={register.isPending} className="btn-primary">{register.isPending ? 'Registering...' : 'Register'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Exceptions Tab ───────────────────────────────────────────────────────────

function ExceptionsTab() {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['gateway', 'messages', 'exceptions'],
    queryFn: () => gatewayApi.getMessages({ status: 'FAILED' }),
    staleTime: 15_000,
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: string; notes: string }) => gatewayApi.manualOverride(id, { action, notes }),
  });

  const exceptions = messages.filter((m) => m.status === 'FAILED' && (m.attempts ?? 0) > 2);

  const byError = useMemo(() => {
    const map = new Map<string, number>();
    exceptions.forEach((e) => map.set(e.errorCode || 'UNKNOWN', (map.get(e.errorCode || 'UNKNOWN') ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [exceptions]);

  const columns: ColumnDef<GatewayMessage, any>[] = [
    { accessorKey: 'reference', header: 'Reference', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.reference}</span> },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.type} /> },
    { accessorKey: 'direction', header: 'Direction', cell: ({ row }) => <StatusBadge status={row.original.direction} /> },
    { accessorKey: 'errorCode', header: 'Error Code', cell: ({ row }) => <span className="font-mono text-xs text-red-600">{row.original.errorCode || '--'}</span> },
    { accessorKey: 'errorMessage', header: 'Error', cell: ({ row }) => <span className="text-xs truncate max-w-[200px] block">{row.original.errorMessage || '--'}</span> },
    { accessorKey: 'attempts', header: 'Attempts', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.attempts ?? 0}</span> },
    { accessorKey: 'lastAttempt', header: 'Last Attempt', cell: ({ row }) => <span className="text-xs">{row.original.lastAttempt ? formatRelative(row.original.lastAttempt) : '--'}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { overrideMutation.mutate({ id: row.original.id, action: 'FORCE_ACK', notes: 'Manual override' }, { onSuccess: () => toast.success('Override applied') }); }} className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">Override</button>
          <button onClick={() => { overrideMutation.mutate({ id: row.original.id, action: 'DISCARD', notes: 'Discarded' }, { onSuccess: () => toast.success('Discarded') }); }} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Discard</button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Exceptions" value={exceptions.length} format="number" icon={AlertOctagon} />
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-2">By Error Type</p>
          {byError.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart><Pie data={byError} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} innerRadius={25}>{byError.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 11 }} /></PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-muted-foreground text-center py-4">No data</p>}
        </div>
        <StatCard label="Avg Age" value={exceptions.length > 0 ? `${Math.round(exceptions.reduce((s, e) => s + (Date.now() - new Date(e.sentAt).getTime()) / 3600_000, 0) / exceptions.length)}h` : '--'} icon={Clock} />
      </div>
      {exceptions.length === 0 ? (
        <EmptyState icon={AlertOctagon} title="No exceptions to review" description="No unroutable or schema-invalid messages at this time." />
      ) : (
        <DataTable columns={columns} data={exceptions} isLoading={isLoading} enableGlobalFilter emptyMessage="No exceptions" />
      )}
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data: throughput = [], isLoading } = useQuery({
    queryKey: ['gateway', 'throughput'],
    queryFn: () => gatewayApi.getThroughput(),
    staleTime: 30_000,
  });
  const { data: stats } = useQuery({
    queryKey: ['gateway', 'stats'],
    queryFn: () => gatewayApi.getLiveStats(),
    staleTime: 10_000,
  });
  const { data: messages = [] } = useQuery({
    queryKey: ['gateway', 'messages', 'all'],
    queryFn: () => gatewayApi.getMessages({}),
    staleTime: 30_000,
  });

  const totalMessages = throughput.reduce((s, t) => s + t.inbound + t.outbound, 0);
  const totalErrors = throughput.reduce((s, t) => s + t.errors, 0);
  const successRate = totalMessages > 0 ? ((totalMessages - totalErrors) / totalMessages) * 100 : 100;

  // Message type distribution
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((m) => map.set(m.type, (map.get(m.type) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [messages]);

  // Direction distribution
  const byDirection = useMemo(() => {
    const inbound = messages.filter((m) => m.direction === 'INBOUND').length;
    const outbound = messages.filter((m) => m.direction === 'OUTBOUND').length;
    return [{ name: 'Inbound', value: inbound }, { name: 'Outbound', value: outbound }];
  }, [messages]);

  if (isLoading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Messages" value={totalMessages} format="number" icon={Activity} />
        <StatCard label="Messages Today" value={stats?.messagesToday ?? 0} format="number" icon={BarChart3} />
        <StatCard label="Avg Latency" value={stats?.avgLatencyMs ? `${stats.avgLatencyMs}ms` : '--'} icon={Clock} />
        <StatCard label="Success Rate" value={successRate} format="percent" icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Message Type Distribution</p>
          {byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>{byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Direction Breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDirection}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{byDirection.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly breakdown */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Throughput Timeline</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={throughput.slice(-24)}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="minute" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(11, 16)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="inbound" name="Inbound" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="outbound" name="Outbound" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Enhanced Gateway Status Tab ──────────────────────────────────────────────

function EnhancedGatewayStatusTab({ onRegister }: { onRegister: () => void }) {
  const { data: gateways = [] } = useQuery({
    queryKey: ['gateway', 'status'],
    queryFn: () => gatewayApi.getGatewayStatus(),
    refetchInterval: 15_000,
  });

  const connected = gateways.filter((g) => g.status === 'ONLINE').length;
  const degraded = gateways.filter((g) => g.status === 'DEGRADED').length;
  const offline = gateways.filter((g) => g.status === 'OFFLINE').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> <span className="font-medium">{connected}</span> Connected</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> <span className="font-medium">{degraded}</span> Degraded</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> <span className="font-medium">{offline}</span> Disconnected</span>
        </div>
        <button onClick={onRegister} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
          <Plus className="w-3.5 h-3.5" /> Register Gateway
        </button>
      </div>
      <GatewayStatusGrid />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function GatewayConsolePage() {
  const [showRegister, setShowRegister] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['gateway', 'messages', 'all'],
    queryFn: () => gatewayApi.getMessages({}),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const failedCount = messages.filter((m) => m.status === 'FAILED').length;
  const exceptionCount = messages.filter((m) => m.status === 'FAILED' && (m.attempts ?? 0) > 2).length;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Financial Gateway Console
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
              LIVE
            </span>
          </span>
        }
        subtitle="Real-time monitoring and management of payment gateway messages"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRegister(true)} className="flex items-center gap-2 btn-secondary">
              <Plus className="w-4 h-4" /> Register Gateway
            </button>
            <button onClick={() => toast.info('Send message from Gateway Detail page')} className="flex items-center gap-2 btn-secondary">
              <Send className="w-4 h-4" /> Send Message
            </button>
          </div>
        }
      />

      <div className="page-container space-y-4">
        <GatewayLiveStats />
        <ThroughputChart />

        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'queue', label: 'Message Queue', content: <div className="p-4"><MessageQueueTable /></div> },
              {
                id: 'failed',
                label: 'Failed / Retry',
                badge: failedCount > 0 ? failedCount : undefined,
                content: <div className="p-4"><FailedRetryTable /></div>,
              },
              {
                id: 'exceptions',
                label: 'Exceptions',
                badge: exceptionCount > 0 ? exceptionCount : undefined,
                content: <div className="p-4"><ExceptionsTab /></div>,
              },
              { id: 'status', label: 'Gateway Status', content: <div className="p-4"><EnhancedGatewayStatusTab onRegister={() => setShowRegister(true)} /></div> },
              { id: 'swift', label: 'SWIFT Messages', content: <div className="p-4"><SwiftMessageSearch /></div> },
              { id: 'analytics', label: 'Analytics', content: <div className="p-4"><AnalyticsTab /></div> },
            ]}
          />
        </div>
      </div>

      {showRegister && <RegisterGatewayDialog onClose={() => setShowRegister(false)} />}
    </>
  );
}
