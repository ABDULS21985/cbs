import { useState } from 'react';
import { Mail, MessageSquare, Bell, Smartphone, Send, CheckCheck, AlertCircle, Filter, RefreshCw, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDateTime, formatDate } from '@/lib/formatters';
import { StatusBadge, EmptyState, StatCard } from '@/components/shared';
import { useCustomerCommunications } from '../hooks/useCustomers';
import { notificationApi } from '@/features/communications/api/communicationApi';
import type { NotificationPreference } from '@/features/communications/api/communicationApi';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  PUSH: <Bell className="h-4 w-4" />,
  IN_APP: <Smartphone className="h-4 w-4" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

const STATUS_ICONS: Record<string, string> = {
  DELIVERED: 'text-green-600',
  SENT: 'text-blue-600',
  FAILED: 'text-red-600',
  BOUNCED: 'text-red-600',
  PENDING: 'text-amber-600',
  READ: 'text-green-700',
};

export function CustomerCommunicationsTab({ customerId, active }: { customerId: number; active: boolean }) {
  const queryClient = useQueryClient();
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: comms = [], isLoading } = useCustomerCommunications(customerId, active);

  const { data: prefs = [] } = useQuery({
    queryKey: ['notifications', 'preferences', customerId],
    queryFn: () => notificationApi.getCustomerPreferences(customerId),
    enabled: active && customerId > 0,
    staleTime: 60_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread', customerId],
    queryFn: () => notificationApi.getUnreadCount(customerId),
    enabled: active && customerId > 0,
    staleTime: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(customerId),
    onSuccess: (data) => {
      toast.success(`Marked ${data.markedAsRead} notifications as read`);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', customerId] });
    },
    onError: () => toast.error('Failed to mark all as read'),
  });

  const updatePref = useMutation({
    mutationFn: ({ channel, eventType, enabled }: { channel: string; eventType: string; enabled: boolean }) =>
      notificationApi.updateNotificationPreference(customerId, channel, eventType, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences', customerId] });
      toast.success('Preference updated');
    },
  });

  // Stats
  const total = comms.length;
  const delivered = comms.filter((c: any) => c.status === 'DELIVERED' || c.deliveryStatus === 'DELIVERED').length;
  const failed = comms.filter((c: any) => c.status === 'FAILED' || c.deliveryStatus === 'FAILED').length;
  const unreadCount = unreadData?.unreadCount ?? 0;

  // Filters
  const filtered = comms.filter((c: any) => {
    if (channelFilter !== 'ALL' && c.channel !== channelFilter) return false;
    if (statusFilter !== 'ALL' && (c.status ?? c.deliveryStatus) !== statusFilter) return false;
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, item: any) => {
    const date = formatDate(item.sentAt || item.createdAt || '');
    (acc[date] = acc[date] || []).push(item);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Messages" value={total} format="number" icon={Mail} />
        <StatCard label="Delivered" value={delivered} format="number" icon={CheckCheck} />
        <StatCard label="Failed" value={failed} format="number" icon={AlertCircle} />
        <StatCard label="Unread" value={unreadCount} format="number" icon={Bell} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <a href="/communications" className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
          <Send className="w-3.5 h-3.5" /> Send Message
        </a>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted disabled:opacity-50">
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded-md border bg-background">
            <option value="ALL">All Channels</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
            <option value="PUSH">Push</option>
            <option value="IN_APP">In-App</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded-md border bg-background">
            <option value="ALL">All Status</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Communication Timeline */}
      {filtered.length === 0 ? (
        <EmptyState icon={Mail} title="No communications" description="No messages match the selected filters" />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{date}</p>
              <div className="space-y-2">
                {items.map((comm: any) => {
                  const status = comm.status ?? comm.deliveryStatus ?? 'PENDING';
                  const channel = comm.channel ?? 'EMAIL';
                  const isExpanded = expandedId === comm.id;
                  return (
                    <div key={comm.id} className="border rounded-lg overflow-hidden hover:border-border/80 transition-colors">
                      <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : comm.id)}>
                        <div className={`p-1.5 rounded-md shrink-0 ${CHANNEL_COLORS[channel] ?? 'bg-gray-100 text-gray-600'}`}>
                          {CHANNEL_ICONS[channel]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate">{comm.subject || comm.eventType || 'Notification'}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(comm.sentAt || comm.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={status} size="sm" />
                            <span className="text-xs text-muted-foreground">· {channel}</span>
                            {comm.recipientAddress && <span className="text-xs text-muted-foreground">· {comm.recipientAddress}</span>}
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t bg-muted/30">
                          {comm.body && <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{comm.body || comm.messagePreview}</p>}
                          {status === 'FAILED' && comm.failureReason && (
                            <p className="text-xs text-red-600 mt-1">Error: {comm.failureReason || comm.errorMessage}</p>
                          )}
                          {comm.templateCode && <p className="text-xs text-muted-foreground mt-1">Template: {comm.templateCode}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preferences */}
      {prefs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Communication Preferences</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Event Type</th><th className="px-3 py-2 text-xs font-medium text-muted-foreground">Channel</th><th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">Enabled</th></tr></thead>
              <tbody>
                {prefs.map((p: NotificationPreference, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-xs">{p.eventType}</td>
                    <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 text-xs ${CHANNEL_COLORS[p.channel] ?? ''} px-2 py-0.5 rounded`}>{CHANNEL_ICONS[p.channel]} {p.channel}</span></td>
                    <td className="px-3 py-2 text-right">
                      <button
                        role="switch" aria-checked={p.isEnabled} aria-label={`${p.eventType} ${p.channel} ${p.isEnabled ? 'enabled' : 'disabled'}`}
                        onClick={() => updatePref.mutate({ channel: p.channel, eventType: p.eventType, enabled: !p.isEnabled })}
                        className={`relative w-9 h-5 rounded-full transition-colors ${p.isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
