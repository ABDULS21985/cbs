import { useEffect, useCallback } from 'react';
import { useNotificationStore, type AppNotification } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';

const POLL_INTERVAL = 30_000; // 30 seconds

export function useNotifications() {
  const { notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Polling for new notifications (fallback when WebSocket not available)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      // In production, poll the API; for demo, do nothing
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const notify = useCallback((type: AppNotification['type'], title: string, message: string, actionUrl?: string) => {
    addNotification({ type, title, message, actionUrl });
  }, [addNotification]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, notify };
}
