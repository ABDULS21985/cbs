import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
// ScheduledNotification is the correct entity returned by the /scheduled endpoint
export type { ScheduledNotification } from '@/features/admin/api/notificationAdminApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  all: ['notifications'] as const,
  templates: ['notifications', 'templates'] as const,
  channels: ['notifications', 'channels'] as const,
  deliveryStats: ['notifications', 'delivery-stats'] as const,
  failures: (page: number, size: number) => ['notifications', 'failures', page, size] as const,
  scheduled: (page: number, size: number) => ['notifications', 'scheduled', page, size] as const,
  preferences: (customerId: number) => ['notifications', 'preferences', customerId] as const,
  customer: (customerId: number) => ['notifications', 'customer', customerId] as const,
} as const;

// ─── Templates ────────────────────────────────────────────────────────────────

export function useNotificationTemplates() {
  return useQuery({
    queryKey: KEYS.templates,
    queryFn: () => notificationApi.getTemplates(),
    staleTime: 60_000,
  });
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export function useNotificationChannels() {
  return useQuery({
    queryKey: KEYS.channels,
    queryFn: () => notificationApi.getChannels(),
    staleTime: 60_000,
  });
}

// ─── Delivery Stats ───────────────────────────────────────────────────────────

export function useDeliveryStats() {
  return useQuery({
    queryKey: KEYS.deliveryStats,
    queryFn: () => notificationApi.getDeliveryStats(),
    staleTime: 30_000,
  });
}

// ─── Failures ─────────────────────────────────────────────────────────────────

export function useNotificationFailures(page = 0, size = 20) {
  return useQuery({
    queryKey: KEYS.failures(page, size),
    queryFn: () => notificationApi.getFailures(page, size),
    staleTime: 15_000,
  });
}

// ─── Scheduled ────────────────────────────────────────────────────────────────

export function useScheduledNotifications(page = 0, size = 20) {
  return useQuery({
    queryKey: KEYS.scheduled(page, size),
    queryFn: () => notificationApi.getScheduled(page, size),
    staleTime: 15_000,
  });
}

// ─── Send Notification ────────────────────────────────────────────────────────

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      eventType: string;
      customerId: number;
      email?: string;
      phone?: string;
      name?: string;
      extraParams?: Record<string, string>;
    }) =>
      notificationApi.sendEvent(
        params.eventType,
        params.customerId,
        params.email,
        params.phone,
        params.name,
        params.extraParams,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export function useNotificationPreferences(customerId: number) {
  return useQuery({
    queryKey: KEYS.preferences(customerId),
    queryFn: () => notificationApi.getPreferences(customerId),
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

export function useUpdatePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      customerId: number;
      channel: string;
      eventType: string;
      enabled: boolean;
    }) =>
      notificationApi.updatePreference(
        params.customerId,
        params.channel,
        params.eventType,
        params.enabled,
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: KEYS.preferences(variables.customerId),
      });
    },
  });
}

// ─── Retry Failed ─────────────────────────────────────────────────────────────

export function useRetryNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.retry(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

// ─── Customer Notifications ───────────────────────────────────────────────────

export function useCustomerNotifications(customerId: number, page = 0, size = 20) {
  return useQuery({
    queryKey: [...KEYS.customer(customerId), page, size],
    queryFn: () => notificationApi.getCustomerNotifications(customerId, page, size),
    enabled: !!customerId,
    staleTime: 15_000,
  });
}

// ─── Send Direct ─────────────────────────────────────────────────────────────

export function useSendDirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: import('../types/notificationExt').SendDirectRequest) =>
      notificationApi.sendDirect(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

// ─── Send Bulk ───────────────────────────────────────────────────────────────

export function useSendBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: import('../types/notificationExt').SendBulkRequest) =>
      notificationApi.sendBulk(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
