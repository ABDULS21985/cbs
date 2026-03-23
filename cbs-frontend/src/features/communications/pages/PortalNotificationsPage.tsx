import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Mail, MessageSquare, Smartphone, Filter, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { formatRelative } from '@/lib/formatters';
import { EmptyState } from '@/components/shared';
import { useAuthStore } from '@/stores/authStore';
import { notificationApi, type NotificationLog, type NotificationPreference } from '../api/communicationApi';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-4 h-4" />,
  SMS: <MessageSquare className="w-4 h-4" />,
  PUSH: <Bell className="w-4 h-4" />,
  IN_APP: <Smartphone className="w-4 h-4" />,
  WEBHOOK: <Globe className="w-4 h-4" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  WEBHOOK: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
};

export function PortalNotificationsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const customerId = user?.customerId ?? 0;
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [showPrefs, setShowPrefs] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['portal-notifications', customerId],
    queryFn: () => notificationApi.getCustomerNotifications(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread', customerId],
    queryFn: () => notificationApi.getUnreadCount(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: prefs = [] } = useQuery({
    queryKey: ['notifications', 'preferences', customerId],
    queryFn: () => notificationApi.getCustomerPreferences(customerId),
    enabled: customerId > 0 && showPrefs,
    staleTime: 60_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(customerId),
    onSuccess: (data) => {
      toast.success(`Marked ${data.markedAsRead} as read`);
      queryClient.invalidateQueries({ queryKey: ['portal-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const updatePref = useMutation({
    mutationFn: ({ channel, eventType, enabled }: { channel: string; eventType: string; enabled: boolean }) =>
      notificationApi.updateNotificationPreference(customerId, channel, eventType, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      toast.success('Preference updated');
    },
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

  const filtered = channelFilter === 'ALL'
    ? notifications
    : notifications.filter((n: NotificationLog) => n.channel === channelFilter);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPrefs(!showPrefs)} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted">
            Preferences
          </button>
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Filter className="w-4 h-4 text-muted-foreground mt-1.5" />
        {['ALL', 'EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK'].map((ch) => (
          <button key={ch} onClick={() => setChannelFilter(ch)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${channelFilter === ch ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
            {ch === 'ALL' ? 'All' : ch.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Preferences panel */}
      {showPrefs && prefs.length > 0 && (
        <div className="surface-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Notification Preferences</h3>
          <p className="text-xs text-muted-foreground">Control what notifications you receive.</p>
          <div className="space-y-2">
            {prefs.map((p: NotificationPreference, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded ${CHANNEL_COLORS[p.channel] ?? ''}`}>{CHANNEL_ICONS[p.channel]}</span>
                  <div>
                    <p className="text-sm">{p.eventType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{p.channel}</p>
                  </div>
                </div>
                <button
                  role="switch" aria-checked={p.isEnabled}
                  aria-label={`${p.eventType} via ${p.channel} ${p.isEnabled ? 'enabled' : 'disabled'}`}
                  onClick={() => updatePref.mutate({ channel: p.channel, eventType: p.eventType, enabled: !p.isEnabled })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${p.isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {filtered.map((n: NotificationLog) => {
            const isRead = n.status === 'READ' || n.status === 'DELIVERED';
            return (
              <div key={n.id} className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${isRead ? '' : 'bg-primary/5 border-primary/20'}`}>
                {!isRead && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                <div className={`p-1.5 rounded-md shrink-0 ${CHANNEL_COLORS[n.channel] ?? 'bg-gray-100'}`}>
                  {CHANNEL_ICONS[n.channel]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isRead ? '' : 'font-medium'}`}>{n.subject || n.eventType || 'Notification'}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{formatRelative(n.sentAt || n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
