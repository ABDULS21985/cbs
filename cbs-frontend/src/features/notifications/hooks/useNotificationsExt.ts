import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notificationExtApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  notifications: {
    all: ['notifications'] as const,
    preferences: (customerId: number) =>
      ['notifications', 'preferences', customerId] as const,
  },
} as const;

// ─── Notification Preferences ────────────────────────────────────────────────

export function useNotificationPreferences(customerId: number) {
  return useQuery({
    queryKey: KEYS.notifications.preferences(customerId),
    queryFn: () => notificationsApi.getPreferences(customerId),
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

export function useSendNotificationEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => notificationsApi.sendEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.all });
    },
  });
}

export function useUpdateNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.updatePreference(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.all });
    },
  });
}

export function useRetryNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.retry(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications.all });
    },
  });
}
