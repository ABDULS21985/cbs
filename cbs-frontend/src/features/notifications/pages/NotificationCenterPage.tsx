import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from '../components/NotificationItem';
import { PageHeader } from '@/components/layout/PageHeader';
import { Trash2, CheckCheck, Loader2 } from 'lucide-react';

const TABS = ['All', 'Unread', 'Alerts', 'Approvals', 'System'] as const;

export function NotificationCenterPage() {
  const { notifications, unreadCount, markAllAsRead, clearAll, isLoading } = useNotifications();
  const [activeTab, setActiveTab] = useState<string>('All');

  const filtered = notifications.filter((n) => {
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'Alerts') return n.type === 'warning' || n.type === 'error';
    if (activeTab === 'Approvals') return n.title.toLowerCase().includes('approv');
    if (activeTab === 'System') return n.type === 'info';
    return true;
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          <div className="flex gap-2">
            <button onClick={markAllAsRead} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
            <button onClick={clearAll} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          </div>
        }
      />
      <div className="page-container">
        <div className="flex gap-2 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="rounded-lg border bg-card divide-y">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No notifications</div>
          ) : (
            filtered.map((n) => <NotificationItem key={n.id} notification={n} />)
          )}
        </div>
      </div>
    </>
  );
}
