import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from '../components/NotificationItem';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { CheckCheck, Bell, RefreshCw, AlertTriangle, Info, CheckCircle, AlertCircle, ExternalLink, X } from 'lucide-react';
import { formatRelative } from '@/lib/formatters';
import type { AppNotification } from '@/stores/notificationStore';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'system', label: 'System' },
] as const;

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export function NotificationCenterPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllAsRead, markAsRead, deleteNotification, isLoading, refetch } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'unread') return !n.read;
      if (activeTab === 'alerts') return n.type === 'warning' || n.type === 'error';
      if (activeTab === 'approvals') return n.title.toLowerCase().includes('approv');
      if (activeTab === 'system') return n.type === 'info';
      return true;
    });
  }, [notifications, activeTab]);

  const selected = selectedId ? notifications.find((n) => n.id === selectedId) ?? null : null;
  const alertCount = notifications.filter((n) => n.type === 'warning' || n.type === 'error').length;
  const weekAgo = Date.now() - 7 * 86400000;
  const weekCount = notifications.filter((n) => new Date(n.createdAt).getTime() > weekAgo).length;

  const handleSelectItem = (n: AppNotification) => {
    setSelectedId(n.id);
    if (!n.read) markAsRead(n.id);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-4">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{notifications.length}</div></div>
          <div className="stat-card"><div className="stat-label">Unread</div><div className={cn('stat-value', unreadCount > 0 && 'text-primary')}>{unreadCount}</div></div>
          <div className="stat-card"><div className="stat-label">Alerts</div><div className={cn('stat-value', alertCount > 0 && 'text-amber-600')}>{alertCount}</div></div>
          <div className="stat-card"><div className="stat-label">This Week</div><div className="stat-value">{weekCount}</div></div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
          {/* LEFT — Notification list */}
          <div className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-4">
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-full bg-muted animate-pulse rounded" />
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    className={cn(selectedId === n.id && 'ring-1 ring-inset ring-primary/30 bg-primary/5')}
                  >
                    <NotificationItem
                      notification={n}
                      onClick={() => handleSelectItem(n)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Detail panel */}
          <div className="rounded-xl border bg-card p-5 hidden lg:block">
            {selected ? (
              <div className="space-y-4">
                {/* Type icon + title */}
                <div className="flex items-start gap-3">
                  {(() => {
                    const cfg = typeConfig[selected.type] || typeConfig.info;
                    const Icon = cfg.icon;
                    return <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', cfg.bg)}><Icon className={cn('w-5 h-5', cfg.color)} /></div>;
                  })()}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{selected.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(selected.createdAt)}</p>
                  </div>
                </div>

                {/* Full message */}
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {selected.actionUrl && (
                    <button onClick={() => navigate(selected.actionUrl!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                      <ExternalLink className="w-3.5 h-3.5" /> Go to resource
                    </button>
                  )}
                  <button onClick={() => { deleteNotification(selected.id); setSelectedId(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <X className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                <Bell className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">Select a notification to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
