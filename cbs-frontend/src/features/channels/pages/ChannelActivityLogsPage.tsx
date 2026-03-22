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
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useChannelActivityLogs,
  useCustomerChannelActivity,
  useLogChannelActivity,
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

// ─── Log Activity Dialog ─────────────────────────────────────────────────────

interface LogActivityDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}

function LogActivityDialog({ open, onClose, onSubmit, isPending }: LogActivityDialogProps) {
  const [form, setForm] = useState({
    customerId: '',
    channel: 'WEB',
    activityType: 'LOGIN',
    resultStatus: 'SUCCESS',
    ipAddress: '',
    responseTimeMs: '',
    errorCode: '',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customerId: form.customerId ? parseInt(form.customerId, 10) : null,
      channel: form.channel,
      activityType: form.activityType,
      resultStatus: form.resultStatus,
      ipAddress: form.ipAddress || null,
      responseTimeMs: form.responseTimeMs ? parseInt(form.responseTimeMs, 10) : null,
      errorCode: form.errorCode || null,
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card">
            <h2 className="text-base font-semibold">Log Channel Activity</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer ID</label>
                <input type="number" className={inputCls} value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel *</label>
                <select className={inputCls} value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                  {['WEB', 'MOBILE', 'ATM', 'BRANCH', 'USSD', 'IVR', 'WHATSAPP', 'POS', 'AGENT', 'API'].map((ch) => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Activity Type *</label>
                <select className={inputCls} value={form.activityType} onChange={(e) => setForm((f) => ({ ...f, activityType: e.target.value }))}>
                  {['LOGIN', 'LOGOUT', 'TRANSFER', 'BALANCE_CHECK', 'PAYMENT', 'STATEMENT', 'PASSWORD_CHANGE', 'PIN_CHANGE', 'REGISTRATION', 'OTHER'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Result *</label>
                <select className={inputCls} value={form.resultStatus} onChange={(e) => setForm((f) => ({ ...f, resultStatus: e.target.value }))}>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                  <option value="ERROR">Error</option>
                  <option value="TIMEOUT">Timeout</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">IP Address</label>
                <input className={inputCls} value={form.ipAddress} onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Response Time (ms)</label>
                <input type="number" className={inputCls} value={form.responseTimeMs} onChange={(e) => setForm((f) => ({ ...f, responseTimeMs: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            {form.resultStatus !== 'SUCCESS' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Error Code</label>
                <input className={inputCls} value={form.errorCode} onChange={(e) => setForm((f) => ({ ...f, errorCode: e.target.value }))} placeholder="e.g. AUTH_FAILED" />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Log Activity
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ChannelActivityLogsPage() {
  const [customerFilter, setCustomerFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);

  const customerId = isCustomerMode && customerFilter ? parseInt(customerFilter, 10) : 0;

  const { data: allLogs = [], isLoading: allLoading } = useChannelActivityLogs();
  const { mutate: logActivity, isPending: logging } = useLogChannelActivity();
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

  const handleLogActivity = (data: Record<string, unknown>) => {
    logActivity(data, {
      onSuccess: () => {
        toast.success('Activity logged');
        setShowLogDialog(false);
      },
      onError: () => toast.error('Failed to log activity'),
    });
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
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Activity Logs</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isCustomerMode && customerId
                  ? `Showing logs for customer ${customerId}`
                  : 'Showing all channel activity logs'}
                {channelFilter ? ` filtered by ${channelFilter}` : ''}
              </p>
            </div>
            <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
              <button
                onClick={() => setShowLogDialog(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Log Activity
              </button>
            </RoleGuard>
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

        <LogActivityDialog
          open={showLogDialog}
          onClose={() => setShowLogDialog(false)}
          onSubmit={handleLogActivity}
          isPending={logging}
        />
      </div>
    </>
  );
}
