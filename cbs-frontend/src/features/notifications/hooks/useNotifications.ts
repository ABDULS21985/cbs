import { useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import { useNotificationStore, type AppNotification } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';

const KEYS = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useNotifications() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useNotificationStore((s) => s.addToast);
  const prevCountRef = useRef<number>(0);

  // ── Backend-synced queries ────────────────────────────────────────────────
  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: KEYS.list,
    queryFn: () => notificationApi.getAll(0, 50),
    refetchInterval: 15_000,
    staleTime: 10_000,
    enabled: isAuthenticated,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: KEYS.unreadCount,
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 10_000,
    staleTime: 8_000,
    enabled: isAuthenticated,
  });

  // Track count changes for pulse animation
  const countIncreased = unreadCount > prevCountRef.current;
  useEffect(() => { prevCountRef.current = unreadCount; }, [unreadCount]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEYS.list });
      const prev = queryClient.getQueryData<AppNotification[]>(KEYS.list);
      queryClient.setQueryData<AppNotification[]>(KEYS.list, (old) =>
        old?.map((n) => n.id === id ? { ...n, read: true } : n),
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(KEYS.list, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: KEYS.list });
      const prev = queryClient.getQueryData<AppNotification[]>(KEYS.list);
      queryClient.setQueryData<AppNotification[]>(KEYS.list, (old) =>
        old?.map((n) => ({ ...n, read: true })),
      );
      queryClient.setQueryData(KEYS.unreadCount, 0);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(KEYS.list, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEYS.list });
      const prev = queryClient.getQueryData<AppNotification[]>(KEYS.list);
      queryClient.setQueryData<AppNotification[]>(KEYS.list, (old) =>
        old?.filter((n) => n.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(KEYS.list, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.list });
    },
  });

  // ── In-app toast (session-only) ───────────────────────────────────────────
  const notify = useCallback(
    (type: AppNotification['type'], title: string, message: string, actionUrl?: string) => {
      addToast({ type, title, message, actionUrl });
    },
    [addToast],
  );

  return {
    notifications,
    unreadCount,
    countIncreased,
    isLoading,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
    clearAll: () => markAllAsReadMutation.mutate(),
    notify,
    refetch,
  };
}
