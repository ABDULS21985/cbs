import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { CheckCheck, Bell } from 'lucide-react';

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const recent = notifications.slice(0, 5);

  return (
    <div className="absolute right-0 mt-1 w-96 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {notifications.some((n) => !n.read) && (
          <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          recent.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={() => {
              if (n.actionUrl) { navigate(n.actionUrl); onClose(); }
            }} />
          ))
        )}
      </div>
      {notifications.length > 5 && (
        <div className="border-t px-4 py-2.5">
          <button onClick={() => { navigate('/notifications'); onClose(); }} className="text-sm text-primary hover:underline w-full text-center">
            View all ({notifications.length})
          </button>
        </div>
      )}
    </div>
  );
}
