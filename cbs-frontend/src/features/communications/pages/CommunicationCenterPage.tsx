import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { Mail, Send, RefreshCw, AlertCircle, CheckCircle, Clock, Percent } from 'lucide-react';
import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useNotifications,
  useNotificationStats,
  useFailedNotifications,
  useScheduledNotifications,
  useRetryFailed,
} from '../hooks/useCommunications';
import { ComposeMessageForm } from '../components/ComposeMessageForm';
import { DeliveryDashboard } from '../components/DeliveryDashboard';
import { ScheduledQueue } from '../components/ScheduledQueue';
import { FailedMessagePanel } from '../components/FailedMessagePanel';
import { MessageDetailDrawer } from '../components/MessageDetailDrawer';
import { BulkSendDialog } from '../components/BulkSendDialog';
import { channelIcon, statusColor } from '../components/ChannelSelector';
import type { NotificationLog } from '../api/communicationApi';

// ── All Messages Tab ────────────────────────────────────────────────────────

function AllMessagesTab() {
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<NotificationLog | null>(null);

  const {
    data: notifications = [],
    isLoading,
    isError,
  } = useNotifications({ search: search || undefined });

  const filtered = notifications.filter((n) => {
    if (channelFilter && n.channel !== channelFilter) return false;
    if (statusFilter && n.status !== statusFilter) return false;
    return true;
  });

  const columns: ColumnDef<NotificationLog, unknown>[] = [
    {
      accessorKey: 'channel',
      header: 'Chan',
      cell: ({ row }) => {
        const Icon = channelIcon(row.original.channel);
        return <Icon className="w-4 h-4 text-muted-foreground" />;
      },
    },
    {
      accessorKey: 'recipientAddress',
      header: 'Recipient',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium truncate max-w-[200px]">{row.original.recipientName ?? row.original.recipientAddress ?? '—'}</p>
          {row.original.recipientName && row.original.recipientAddress && (
            <p className="text-[10px] text-muted-foreground truncate">{row.original.recipientAddress}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.subject ?? row.original.eventType ?? '—'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Sent',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.sentAt ?? row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelected(row.original); }}
          className="px-2 py-1 text-xs font-medium rounded bg-muted hover:bg-muted/80 transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border bg-background">
            <option value="">All Channels</option>
            {['EMAIL', 'SMS', 'PUSH', 'IN_APP'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border bg-background">
            <option value="">All Statuses</option>
            {['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient or subject…"
            className="h-8 px-3 text-xs rounded-lg border bg-background w-52 focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Notification messages could not be loaded from the backend.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            onRowClick={setSelected}
            enableGlobalFilter
            emptyMessage="No messages found"
          />
        )}
      </div>

      <MessageDetailDrawer message={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function CommunicationCenterPage() {
  useEffect(() => { document.title = 'Communication Center | CBS'; }, []);
  const [showCompose, setShowCompose] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const statsQuery = useNotificationStats();
  const failuresQuery = useFailedNotifications();
  const scheduledQuery = useScheduledNotifications();
  const stats = statsQuery.data;
  const failures = failuresQuery.data ?? [];
  const scheduled = scheduledQuery.data ?? [];
  const retryAll = useRetryFailed();
  const hasLoadError = statsQuery.isError || failuresQuery.isError || scheduledQuery.isError;

  const handleRetryAll = () => {
    retryAll.mutate(undefined, {
      onSuccess: (data) => toast.success(`Retried ${data.retried} notifications`),
      onError: () => toast.error('Failed to retry'),
    });
  };

  const tabs = [
    {
      id: 'messages',
      label: 'All Messages',
      content: <div className="p-4"><AllMessagesTab /></div>,
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      badge: scheduled.length || undefined,
      content: <div className="p-4"><ScheduledQueue /></div>,
    },
    {
      id: 'failed',
      label: 'Failed',
      badge: failures.length || undefined,
      content: <div className="p-4"><FailedMessagePanel /></div>,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      content: <div className="p-4"><DeliveryDashboard /></div>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Communication Center"
        subtitle="Omnichannel messaging — email, SMS, push notifications, in-app alerts"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Send className="w-4 h-4" /> Compose
            </button>
            <button onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              <Mail className="w-4 h-4" /> Bulk Send
            </button>
            <button onClick={handleRetryAll} disabled={retryAll.isPending || failures.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50">
              <RefreshCw className={cn('w-4 h-4', retryAll.isPending && 'animate-spin')} /> Retry Failed
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {hasLoadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            One or more communication datasets failed to load. Backend errors are now surfaced instead of being shown as empty lists.
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total Sent" value={statsQuery.isError ? '--' : stats?.total ?? 0} format="number" icon={Mail} />
          <StatCard label="Delivered" value={statsQuery.isError ? '--' : stats?.delivered ?? 0} format="number" icon={CheckCircle} />
          <StatCard label="Failed" value={statsQuery.isError ? '--' : stats?.failed ?? 0} format="number" icon={AlertCircle} />
          <StatCard label="Pending" value={statsQuery.isError ? '--' : stats?.pending ?? 0} format="number" icon={Clock} />
          <StatCard label="Delivery Rate" value={stats?.deliveryRatePct != null ? `${stats.deliveryRatePct.toFixed(1)}%` : '--'} icon={Percent} />
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>

      {/* Compose Sheet */}
      <ComposeMessageForm open={showCompose} onClose={() => setShowCompose(false)} />

      {/* Bulk Send Dialog */}
      <BulkSendDialog open={showBulk} onClose={() => setShowBulk(false)} />
    </>
  );
}
