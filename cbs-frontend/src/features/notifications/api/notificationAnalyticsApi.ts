import { apiGet, apiPost } from '@/lib/api';
import type { NotificationLog } from '../types/notificationExt';

// ---------------------------------------------------------------------------
// Types for analytics endpoints
// ---------------------------------------------------------------------------

export interface DeliveryStatsResponse {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRatePct: number;
  failureRatePct: number;
  [key: string]: unknown;
}

export interface DeliveryTrendPoint {
  date: string;
  delivered: number;
  failed: number;
  pending: number;
}

export interface ChannelDeliveryStat {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
}

export interface DeliveryFailure {
  id: number;
  templateCode: string;
  channel: string;
  recipientAddress: string;
  failureReason: string;
  createdAt: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Notification Analytics API
// ---------------------------------------------------------------------------

export const notificationAnalyticsApi = {
  /** GET /delivery-stats — aggregate delivery statistics */
  getDeliveryStats: () =>
    apiGet<DeliveryStatsResponse>('/api/v1/notifications/delivery-stats'),

  /** GET /delivery-stats/trend — daily delivery trend */
  getDeliveryTrend: (days = 30) =>
    apiGet<DeliveryTrendPoint[]>('/api/v1/notifications/delivery-stats/trend', { days }),

  /** GET /delivery-stats/by-channel — delivery breakdown by channel */
  getDeliveryByChannel: () =>
    apiGet<ChannelDeliveryStat[]>('/api/v1/notifications/delivery-stats/by-channel'),

  /** GET /delivery-stats/failures — list of failed deliveries */
  getFailures: (page = 0, size = 50) =>
    apiGet<DeliveryFailure[]>('/api/v1/notifications/delivery-stats/failures', { page, size }),

  /** GET / — full notification log (paginated) */
  getNotificationLog: (page = 0, size = 50) =>
    apiGet<NotificationLog[]>('/api/v1/notifications', { page, size }),

  /** POST /retry — retry all failed notifications */
  retryAllFailed: () =>
    apiPost<unknown>('/api/v1/notifications/retry'),

  /** POST /{id}/read — mark notification as read */
  markAsRead: (id: number) =>
    apiPost<unknown>(`/api/v1/notifications/${id}/read`),
};
