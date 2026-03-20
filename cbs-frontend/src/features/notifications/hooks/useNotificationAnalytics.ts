import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAnalyticsApi } from '../api/notificationAnalyticsApi';

// ─── Query Keys ──────────────────────────────────────────────────────────────

const ANALYTICS_KEYS = {
  all: ['notification-analytics'] as const,
  deliveryStats: ['notification-analytics', 'delivery-stats'] as const,
  deliveryTrend: (days: number) => ['notification-analytics', 'delivery-trend', days] as const,
  deliveryByChannel: ['notification-analytics', 'delivery-by-channel'] as const,
  failures: (page: number, size: number) => ['notification-analytics', 'failures', page, size] as const,
  log: (page: number, size: number) => ['notification-analytics', 'log', page, size] as const,
} as const;

// ─── Delivery Stats ──────────────────────────────────────────────────────────

export function useDeliveryStats() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.deliveryStats,
    queryFn: () => notificationAnalyticsApi.getDeliveryStats(),
    staleTime: 60_000,
  });
}

// ─── Delivery Trend ──────────────────────────────────────────────────────────

export function useDeliveryTrend(days = 30) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.deliveryTrend(days),
    queryFn: () => notificationAnalyticsApi.getDeliveryTrend(days),
    staleTime: 60_000,
  });
}

// ─── Delivery By Channel ─────────────────────────────────────────────────────

export function useDeliveryByChannel() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.deliveryByChannel,
    queryFn: () => notificationAnalyticsApi.getDeliveryByChannel(),
    staleTime: 60_000,
  });
}

// ─── Delivery Failures ───────────────────────────────────────────────────────

export function useDeliveryFailures(page = 0, size = 50) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.failures(page, size),
    queryFn: () => notificationAnalyticsApi.getFailures(page, size),
    staleTime: 30_000,
  });
}

// ─── Notification Log ────────────────────────────────────────────────────────

export function useNotificationLog(page = 0, size = 50) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.log(page, size),
    queryFn: () => notificationAnalyticsApi.getNotificationLog(page, size),
    staleTime: 30_000,
  });
}

// ─── Retry All Failed ────────────────────────────────────────────────────────

export function useRetryAllFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationAnalyticsApi.retryAllFailed(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ANALYTICS_KEYS.all });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
