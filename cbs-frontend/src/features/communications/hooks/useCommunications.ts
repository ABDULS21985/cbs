import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, communicationApi } from '../api/communicationApi';

const KEYS = {
  notifications: ['notifications'] as const,
  list: (params?: Record<string, unknown>) => ['notifications', 'list', params] as const,
  stats: ['notifications', 'stats'] as const,
  trend: ['notifications', 'trend'] as const,
  byChannel: ['notifications', 'by-channel'] as const,
  failures: ['notifications', 'failures'] as const,
  scheduled: ['notifications', 'scheduled'] as const,
  customer: (id: number) => ['notifications', 'customer', id] as const,
  unread: (id?: number) => ['notifications', 'unread', id] as const,
  channels: ['notifications', 'channels'] as const,
  templates: ['notifications', 'templates'] as const,
  communications: ['communications'] as const,
};

export function useNotifications(params?: { search?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: KEYS.list(params as Record<string, unknown>),
    queryFn: () => notificationApi.list(params),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: () => notificationApi.getDeliveryStats(),
    staleTime: 30_000,
  });
}

export function useDeliveryTrend() {
  return useQuery({
    queryKey: KEYS.trend,
    queryFn: () => notificationApi.getDeliveryTrend(),
    staleTime: 60_000,
  });
}

export function useDeliveryByChannel() {
  return useQuery({
    queryKey: KEYS.byChannel,
    queryFn: () => notificationApi.getDeliveryByChannel(),
    staleTime: 60_000,
  });
}

export function useFailedNotifications(page = 0, size = 50) {
  return useQuery({
    queryKey: [...KEYS.failures, page, size],
    queryFn: () => notificationApi.getFailures(page, size),
    staleTime: 30_000,
  });
}

export function useScheduledNotifications() {
  return useQuery({
    queryKey: KEYS.scheduled,
    queryFn: () => notificationApi.getScheduled(),
    staleTime: 30_000,
  });
}

export function useCustomerNotifications(customerId: number) {
  return useQuery({
    queryKey: KEYS.customer(customerId),
    queryFn: () => notificationApi.getCustomerNotifications(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useUnreadCount(customerId?: number) {
  return useQuery({
    queryKey: KEYS.unread(customerId),
    queryFn: () => notificationApi.getUnreadCount(customerId),
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

export function useChannelConfigs() {
  return useQuery({
    queryKey: KEYS.channels,
    queryFn: () => notificationApi.getChannels(),
    staleTime: 300_000,
  });
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: KEYS.templates,
    queryFn: () => notificationApi.getTemplates(),
    staleTime: 60_000,
  });
}

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ params, body }: {
      params: { eventType: string; customerId?: number; email?: string; phone?: string; name?: string };
      body: Record<string, string>;
    }) => notificationApi.send(params, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useRetryFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.retryFailed(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.failures });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: number) => notificationApi.markAllRead(customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
    },
  });
}

export function useSendDirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { channel: string; recipientAddress: string; recipientName: string; subject: string; body: string; customerId?: number; eventType?: string }) =>
      notificationApi.sendDirect(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

export function useSendBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { channel: string; subject: string; body: string; eventType?: string; recipients: { address: string; name: string; customerId?: number }[] }) =>
      notificationApi.sendBulk(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.stats });
    },
  });
}

// Legacy communications hooks
export function useCommunications(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.communications, filters],
    queryFn: () => communicationApi.getAll(filters),
    staleTime: 30_000,
  });
}
