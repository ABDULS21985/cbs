import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { CheckCheck, Bell } from 'lucide-react';

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, unreadCount, markAllAsRead, isLoading } = useNotifications();
  const navigate = useNavigate();
  const recent = notifications.slice(0, 8);

  return (
    <div className="absolute right-0 z-[80] mt-1 w-96 overflow-hidden rounded-xl border bg-popover shadow-[0_18px_40px_rgba(15,23,42,0.18)] animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto divide-y">
        {isLoading ? (
          // Skeleton loading
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-full bg-muted animate-pulse rounded" />
                <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
            <p className="text-xs mt-0.5">You're all caught up!</p>
          </div>
        ) : (
          recent.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              compact
              showDelete={false}
              onClick={() => {
                if (n.actionUrl) { navigate(n.actionUrl); onClose(); }
              }}
            />
          ))
        )}
      </div>

      <div className="border-t px-4 py-2.5">
        <button
          onClick={() => { navigate('/notifications'); onClose(); }}
          className="text-sm text-primary hover:underline w-full text-center font-medium"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
