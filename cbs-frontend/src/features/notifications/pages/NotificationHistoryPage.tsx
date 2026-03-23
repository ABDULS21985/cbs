import { useState, useMemo, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import {
  BarChart3, List, AlertTriangle, RefreshCw, Download, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, DataTable, StatusBadge, EmptyState, ExportMenu } from '@/components/shared';
import { cn } from '@/lib/utils';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationAnalyticsApi } from '../api/notificationAnalyticsApi';
import {
  useDeliveryStats,
  useDeliveryTrend,
  useDeliveryByChannel,
  useDeliveryFailures,
  useNotificationLog,
  useRetryAllFailed,
} from '../hooks/useNotificationAnalytics';
import { ChannelHealthCards } from '../components/ChannelHealthCards';
import { FailureReasonsChart } from '../components/FailureReasonsChart';
import { NotificationLogDetail } from '../components/NotificationLogDetail';
import type { NotificationLog, NotificationChannel, NotificationStatus } from '../types/notificationExt';
import type { DeliveryFailure } from '../api/notificationAnalyticsApi';

// ---------------------------------------------------------------------------
// Chart tooltip style (dark-mode safe)
// ---------------------------------------------------------------------------

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--popover))',
  borderColor: 'hsl(var(--border))',
  borderRadius: '0.5rem',
  color: 'hsl(var(--popover-foreground))',
};

// ---------------------------------------------------------------------------
// Chart colors
// ---------------------------------------------------------------------------

const COLORS = {
  delivered: 'hsl(142 71% 45%)',   // green
  failed: 'hsl(0 84% 60%)',        // red
  pending: 'hsl(40 96% 53%)',      // amber
  sent: 'hsl(200 98% 39%)',        // blue
};

// =========================================================================
// TAB 1 — Dashboard
// =========================================================================

function DashboardTab() {
  const { data: stats, isLoading: statsLoading } = useDeliveryStats();
  const { data: trend, isLoading: trendLoading } = useDeliveryTrend(30);
  const { data: byChannel, isLoading: channelLoading } = useDeliveryByChannel();
  const { data: failures, isLoading: failuresLoading } = useDeliveryFailures(0, 200);

  return (
    <div className="page-container space-y-6">
      {/* Row 1: Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Total Sent" value={stats?.total} loading={statsLoading} />
        <MiniStat label="Delivered" value={stats?.delivered} loading={statsLoading} color="text-green-600 dark:text-green-400" />
        <MiniStat label="Failed" value={stats?.failed} loading={statsLoading} color="text-red-600 dark:text-red-400" />
        <MiniStat label="Delivery Rate" value={stats?.deliveryRatePct != null ? `${stats.deliveryRatePct.toFixed(1)}%` : undefined} loading={statsLoading} />
      </div>

      {/* Row 2: Channel health cards */}
      <ChannelHealthCards data={byChannel} isLoading={channelLoading} />

      {/* Row 3: Delivery trend area chart */}
      <div className="surface-card p-4">
        <h3 className="text-sm font-medium mb-4">Delivery Trend (30 days)</h3>
        {trendLoading ? (
          <div className="flex items-center justify-center h-[280px]" role="status">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !trend || trend.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            No trend data available
          </div>
        ) : (
          <div aria-label="30-day delivery trend chart" role="img">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => { try { return format(new Date(v), 'dd MMM'); } catch { return v; } }}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="delivered" stackId="1" stroke={COLORS.delivered} fill={COLORS.delivered} fillOpacity={0.3} name="Delivered" />
                <Area type="monotone" dataKey="failed" stackId="1" stroke={COLORS.failed} fill={COLORS.failed} fillOpacity={0.3} name="Failed" />
                <Area type="monotone" dataKey="pending" stackId="1" stroke={COLORS.pending} fill={COLORS.pending} fillOpacity={0.3} name="Pending" />
                <Legend iconType="circle" iconSize={8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row 4: Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel bar chart */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-medium mb-4">Delivery by Channel</h3>
          {channelLoading ? (
            <div className="flex items-center justify-center h-[300px]" role="status">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !byChannel || byChannel.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
              No channel data available
            </div>
          ) : (
            <div aria-label="Delivery by channel bar chart" role="img">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byChannel} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="channel" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="sent" fill={COLORS.sent} name="Sent" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="delivered" fill={COLORS.delivered} name="Delivered" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="failed" fill={COLORS.failed} name="Failed" radius={[2, 2, 0, 0]} />
                  <Legend iconType="circle" iconSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Failure reasons donut */}
        <div className="surface-card p-4">
          <h3 className="text-sm font-medium mb-4">Failure Reasons</h3>
          <FailureReasonsChart data={failures} isLoading={failuresLoading} height={300} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini stat card (simpler than StatCard for the top row)
// ---------------------------------------------------------------------------

function MiniStat({ label, value, loading, color }: { label: string; value?: number | string; loading: boolean; color?: string }) {
  if (loading) {
    return (
      <div className="stat-card animate-pulse">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-7 w-16 bg-muted rounded mt-2" />
      </div>
    );
  }
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={cn('text-xl font-bold tabular-nums mt-1', color)}>
        {value != null ? (typeof value === 'number' ? value.toLocaleString() : value) : '—'}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 2 — Delivery Log
// =========================================================================

const ALL_CHANNELS: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK'];
const ALL_STATUSES: NotificationStatus[] = ['PENDING', 'PENDING_DISPATCH', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'BOUNCED', 'OPTED_OUT'];

function DeliveryLogTab() {
  const qc = useQueryClient();
  const { data: logs, isLoading } = useNotificationLog(0, 200);
  const retryMutation = useRetryAllFailed();

  // Per-row retry: POST /notifications/retry (retries all failed) after marking context
  const singleRetryMutation = useMutation({
    mutationFn: (_id: number) => notificationAnalyticsApi.retryAllFailed(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-analytics'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification queued for retry');
    },
    onError: () => toast.error('Failed to retry notification'),
  });

  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      if (channelFilter !== 'ALL' && l.channel !== channelFilter) return false;
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      return true;
    });
  }, [logs, channelFilter, statusFilter]);

  const columns = useMemo<ColumnDef<NotificationLog, any>[]>(() => [
    { accessorKey: 'id', header: 'ID', size: 60 },
    { accessorKey: 'templateCode', header: 'Template', size: 120 },
    {
      accessorKey: 'channel',
      header: 'Channel',
      size: 90,
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: 'recipientAddress',
      header: 'Recipient',
      size: 180,
      cell: ({ getValue }) => (
        <span className="truncate max-w-[180px] block">{getValue<string>() || '—'}</span>
      ),
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      size: 200,
      cell: ({ getValue }) => (
        <span className="truncate max-w-[200px] block">{getValue<string>() || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
    },
    {
      accessorKey: 'sentAt',
      header: 'Sent At',
      size: 140,
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return v ? format(new Date(v), 'dd MMM yyyy, HH:mm') : '—';
      },
    },
    {
      accessorKey: 'deliveredAt',
      header: 'Delivered At',
      size: 140,
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return v ? format(new Date(v), 'dd MMM yyyy, HH:mm') : '—';
      },
    },
    {
      accessorKey: 'retryCount',
      header: 'Retries',
      size: 70,
      cell: ({ row }) => `${row.original.retryCount}/${row.original.maxRetries}`,
    },
  ], []);

  const handleExportCsv = useCallback(() => {
    if (!filtered.length) return;
    const headers = ['ID', 'Template', 'Channel', 'Recipient', 'Subject', 'Status', 'Sent At', 'Delivered At', 'Retry Count'];
    const rows = filtered.map((r) => [
      r.id, r.templateCode, r.channel, r.recipientAddress, r.subject, r.status, r.sentAt, r.deliveredAt, r.retryCount,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notification-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  return (
    <div className="page-container space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border bg-background"
          aria-label="Filter by channel"
        >
          <option value="ALL">All Channels</option>
          {ALL_CHANNELS.map((ch) => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border bg-background"
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => retryMutation.mutate()}
          disabled={retryMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', retryMutation.isPending && 'animate-spin')} />
          Retry Failed
        </button>

        <ExportMenu onExportCsv={handleExportCsv} />
      </div>

      {/* Data table */}
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={setSelectedLog}
        enableGlobalFilter
        pageSize={15}
        emptyMessage="No notification logs found"
      />

      {/* Slide-out detail */}
      <NotificationLogDetail
        notification={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        onRetry={(id) => singleRetryMutation.mutate(id)}
        retrying={singleRetryMutation.isPending}
      />
    </div>
  );
}

// =========================================================================
// TAB 3 — Failures
// =========================================================================

function FailuresTab() {
  const { data: failures, isLoading } = useDeliveryFailures(0, 200);
  const retryMutation = useRetryAllFailed();

  const failureCount = failures?.length ?? 0;

  const failureColumns = useMemo<ColumnDef<DeliveryFailure, any>[]>(() => [
    { accessorKey: 'id', header: 'ID', size: 60 },
    { accessorKey: 'templateCode', header: 'Template', size: 140 },
    {
      accessorKey: 'channel',
      header: 'Channel',
      size: 90,
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: 'recipientAddress',
      header: 'Recipient',
      size: 180,
      cell: ({ getValue }) => (
        <span className="truncate max-w-[180px] block">{getValue<string>() || '—'}</span>
      ),
    },
    {
      accessorKey: 'failureReason',
      header: 'Failure Reason',
      size: 250,
      cell: ({ getValue }) => (
        <span className="text-red-600 dark:text-red-400 truncate max-w-[250px] block">
          {getValue<string>() || 'Unknown'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 90,
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      size: 140,
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return v ? format(new Date(v), 'dd MMM yyyy, HH:mm') : '—';
      },
    },
  ], []);

  return (
    <div className="page-container space-y-4">
      {/* Alert banner */}
      {failureCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 flex-1">
            <span className="font-semibold">{failureCount}</span> failed notifications require attention.
          </p>
          <button
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', retryMutation.isPending && 'animate-spin')} />
            Retry All
          </button>
        </div>
      )}

      {/* Failure reasons chart */}
      <div className="surface-card p-4">
        <h3 className="text-sm font-medium mb-2">Failure Reasons Breakdown</h3>
        <FailureReasonsChart data={failures} isLoading={isLoading} height={260} />
      </div>

      {/* Data table */}
      <DataTable
        columns={failureColumns}
        data={failures || []}
        isLoading={isLoading}
        enableGlobalFilter
        pageSize={15}
        emptyMessage="No failed notifications"
      />
    </div>
  );
}

// =========================================================================
// Main Page
// =========================================================================

export function NotificationHistoryPage() {
  return (
    <>
      <PageHeader
        title="Notification Delivery History"
        subtitle="Monitor delivery performance, track failures, and analyze notification channels"
      />
      <TabsPage
        syncWithUrl
        defaultTab="dashboard"
        tabs={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: BarChart3,
            content: <DashboardTab />,
          },
          {
            id: 'log',
            label: 'Delivery Log',
            icon: List,
            content: <DeliveryLogTab />,
          },
          {
            id: 'failures',
            label: 'Failures',
            icon: AlertTriangle,
            content: <FailuresTab />,
          },
        ]}
      />
    </>
  );
}
