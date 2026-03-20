import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import { useNotificationStore, type AppNotification } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';

const POLL_INTERVAL = 30_000;

const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useNotifications() {
  const store = useNotificationStore();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Fetch notifications from backend ────────────────────────────────────
  const {
    data: notifications = [],
    isLoading,
  } = useQuery({
    queryKey: NOTIFICATION_KEYS.list,
    queryFn: () => notificationApi.getAll(0, 50),
    refetchInterval: POLL_INTERVAL,
    staleTime: 10_000,
    enabled: isAuthenticated,
  });

  // ── Fetch unread count from backend ─────────────────────────────────────
  const { data: unreadCount = 0 } = useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount,
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: POLL_INTERVAL,
    staleTime: 10_000,
    enabled: isAuthenticated,
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onMutate: (id) => {
      // Optimistic update in store
      store.markAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onMutate: () => {
      store.markAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onMutate: (id) => {
      store.removeNotification(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  // ── Local-only helper (for optimistic / in-app toasts) ──────────────────
  const notify = useCallback(
    (type: AppNotification['type'], title: string, message: string, actionUrl?: string) => {
      store.addNotification({ type, title, message, actionUrl });
    },
    [store],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
    clearAll: () => markAllAsReadMutation.mutate(), // "clear all" now marks all as read on backend
    notify,
  };
}
