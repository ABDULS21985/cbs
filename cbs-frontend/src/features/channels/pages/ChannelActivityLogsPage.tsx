import { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Smartphone,
  CreditCard,
  Building2,
  Phone,
  Radio,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useChannelActivityLogs,
  useCustomerChannelActivity,
} from '../hooks/useDigitalBanking';
import type { ChannelActivityLog } from '../api/digitalBankingApi';

// ─── Channel meta ────────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { icon: typeof Globe; color: string }> = {
  WEB: { icon: Globe, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MOBILE: { icon: Smartphone, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ATM: { icon: CreditCard, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  BRANCH: { icon: Building2, color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  USSD: { icon: Phone, color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  IVR: { icon: Radio, color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
};

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: 'text-green-600',
  FAILURE: 'text-red-600',
  ERROR: 'text-red-600',
  TIMEOUT: 'text-amber-600',
};

// ─── Columns ─────────────────────────────────────────────────────────────────

const columns: ColumnDef<ChannelActivityLog, unknown>[] = [
  {
    accessorKey: 'logId',
    header: 'Log ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.logId}</span>
    ),
  },
  {
    accessorKey: 'customerId',
    header: 'Customer',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.customerId ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ row }) => {
      const ch = row.original.channel;
      const meta = CHANNEL_META[ch];
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
            meta?.color ?? 'bg-gray-100 text-gray-600',
          )}
        >
          {ch}
        </span>
      );
    },
  },
  {
    accessorKey: 'activityType',
    header: 'Activity',
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
        {row.original.activityType}
      </span>
    ),
  },
  {
    accessorKey: 'resultStatus',
    header: 'Result',
    cell: ({ row }) => {
      const status = row.original.resultStatus;
      const colorCls = RESULT_COLORS[status] ?? 'text-muted-foreground';
      const Icon = status === 'SUCCESS' ? CheckCircle2 : status === 'FAILURE' || status === 'ERROR' ? XCircle : AlertCircle;
      return (
        <span className={cn('flex items-center gap-1 text-xs font-medium', colorCls)}>
          <Icon className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'responseTimeMs',
    header: 'Response (ms)',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{row.original.responseTimeMs ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.ipAddress || '—'}</span>
    ),
  },
  {
    accessorKey: 'errorCode',
    header: 'Error Code',
    cell: ({ row }) =>
      row.original.errorCode ? (
        <span className="font-mono text-xs text-red-600">{row.original.errorCode}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Timestamp',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
    ),
  },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ChannelActivityLogsPage() {
  const [customerFilter, setCustomerFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [isCustomerMode, setIsCustomerMode] = useState(false);

  const customerId = isCustomerMode && customerFilter ? parseInt(customerFilter, 10) : 0;

  const { data: allLogs = [], isLoading: allLoading } = useChannelActivityLogs();
  const { data: customerLogs = [], isLoading: customerLoading } = useCustomerChannelActivity(
    customerId,
    channelFilter || undefined,
  );

  const logs = isCustomerMode && customerId ? customerLogs : allLogs;
  const isLoading = isCustomerMode && customerId ? customerLoading : allLoading;

  const filteredLogs = useMemo(() => {
    if (isCustomerMode && customerId) return logs;
    if (!channelFilter) return logs;
    return logs.filter((l) => l.channel === channelFilter);
  }, [logs, channelFilter, isCustomerMode, customerId]);

  const successCount = filteredLogs.filter((l) => l.resultStatus === 'SUCCESS').length;
  const failureCount = filteredLogs.filter(
    (l) => l.resultStatus === 'FAILURE' || l.resultStatus === 'ERROR',
  ).length;
  const avgResponseTime =
    filteredLogs.length > 0
      ? Math.round(
          filteredLogs.reduce((sum, l) => sum + (l.responseTimeMs ?? 0), 0) / filteredLogs.length,
        )
      : 0;

  const handleCustomerSearch = () => {
    if (customerFilter) {
      setIsCustomerMode(true);
    } else {
      setIsCustomerMode(false);
    }
  };

  const inputCls =
    'rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <PageHeader
        title="Channel Activity Logs"
        subtitle="Browse and analyze channel activity across all customers and channels."
        backTo="/channels/digital"
      />
      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Logs" value={filteredLogs.length} format="number" icon={Activity} loading={isLoading} />
          <StatCard label="Successful" value={successCount} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Failures" value={failureCount} format="number" icon={XCircle} loading={isLoading} />
          <StatCard label="Avg Response (ms)" value={avgResponseTime} format="number" icon={Clock} loading={isLoading} />
        </div>

        {/* Filters */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={cn(inputCls, 'w-36')}
                  value={customerFilter}
                  onChange={(e) => {
                    setCustomerFilter(e.target.value);
                    if (!e.target.value) setIsCustomerMode(false);
                  }}
                  placeholder="Filter by ID"
                />
                <button
                  onClick={handleCustomerSearch}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel</label>
              <select
                className={cn(inputCls, 'w-36')}
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="">All Channels</option>
                {['WEB', 'MOBILE', 'ATM', 'BRANCH', 'USSD', 'IVR', 'WHATSAPP', 'POS', 'AGENT', 'API'].map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
            {isCustomerMode && (
              <button
                onClick={() => {
                  setIsCustomerMode(false);
                  setCustomerFilter('');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-semibold">Activity Logs</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isCustomerMode && customerId
                ? `Showing logs for customer ${customerId}`
                : 'Showing all channel activity logs'}
              {channelFilter ? ` filtered by ${channelFilter}` : ''}
            </p>
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={filteredLogs}
              isLoading={isLoading}
              enableGlobalFilter
              emptyMessage="No activity logs found"
              pageSize={20}
            />
          </div>
        </div>
      </div>
    </>
  );
}
