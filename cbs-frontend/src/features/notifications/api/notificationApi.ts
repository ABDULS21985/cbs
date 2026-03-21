import { apiGet, apiPost, apiDelete, apiPut } from '@/lib/api';
import type { AppNotification } from '@/stores/notificationStore';
import type {
  NotificationLog,
  NotificationPreference,
  NotificationTemplate,
  DeliveryStats,
  SendDirectRequest,
  SendBulkRequest,
} from '../types/notificationExt';

// ---------------------------------------------------------------------------
// Map backend NotificationLog → frontend AppNotification
// ---------------------------------------------------------------------------
function mapToAppNotification(log: NotificationLog): AppNotification {
  return {
    id: String(log.id),
    type: log.status === 'FAILED'
      ? 'error'
      : log.eventType?.includes('ALERT')
        ? 'warning'
        : 'info',
    title: log.subject || log.eventType || 'Notification',
    message: log.body || '',
    read: log.status === 'READ',
    createdAt: log.createdAt,
    actionUrl: undefined,
  };
}

// ---------------------------------------------------------------------------
// Helper to build query-string from params (used for POST/PUT that need
// query params, since apiPost/apiPut only accept a body argument).
// ---------------------------------------------------------------------------
function withParams(base: string, params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.append(k, String(v));
  }
  const str = qs.toString();
  return str ? `${base}?${str}` : base;
}

// ---------------------------------------------------------------------------
// Notification API – matches backend /api/v1/notifications
// ---------------------------------------------------------------------------
export const notificationApi = {
  // ── Core CRUD ──────────────────────────────────────────────────────────

  /** GET / – all notifications (mapped to AppNotification) */
  getAll: async (page = 0, size = 20): Promise<AppNotification[]> => {
    const data = await apiGet<NotificationLog[]>('/api/v1/notifications', { page, size });
    return (data || []).map(mapToAppNotification);
  },

  /** GET /unread-count?customerId= */
  getUnreadCount: async (customerId?: number): Promise<number> => {
    const params: Record<string, unknown> = {};
    if (customerId !== undefined) params.customerId = customerId;
    const data = await apiGet<{ unreadCount: number }>('/api/v1/notifications/unread-count', params);
    return data?.unreadCount ?? 0;
  },

  /** POST /{id}/read */
  markAsRead: (id: string) =>
    apiPost<{ id: number; status: string }>(`/api/v1/notifications/${id}/read`),

  /** POST /mark-all-read?customerId= */
  markAllAsRead: (customerId?: number) => {
    const url = customerId !== undefined
      ? withParams('/api/v1/notifications/mark-all-read', { customerId })
      : '/api/v1/notifications/mark-all-read';
    return apiPost<{ markedAsRead: number }>(url);
  },

  /** DELETE /{id} */
  delete: (id: string) =>
    apiDelete<{ id: number; deleted: boolean }>(`/api/v1/notifications/${id}`),

  // ── Customer-scoped ────────────────────────────────────────────────────

  /** GET /customer/{customerId} */
  getCustomerNotifications: async (customerId: number, page = 0, size = 20): Promise<AppNotification[]> => {
    const data = await apiGet<NotificationLog[]>(
      `/api/v1/notifications/customer/${customerId}`,
      { page, size },
    );
    return (data || []).map(mapToAppNotification);
  },

  // ── Templates & channels ───────────────────────────────────────────────

  /** GET /templates */
  getTemplates: () =>
    apiGet<NotificationTemplate[]>('/api/v1/notifications/templates'),

  /** GET /channels */
  getChannels: () =>
    apiGet<unknown[]>('/api/v1/notifications/channels'),

  // ── Delivery & monitoring ──────────────────────────────────────────────

  /** GET /delivery-stats */
  getDeliveryStats: () =>
    apiGet<DeliveryStats>('/api/v1/notifications/delivery-stats'),

  /** GET /failures?page=&size= */
  getFailures: (page = 0, size = 20) =>
    apiGet<NotificationLog[]>('/api/v1/notifications/failures', { page, size }),

  /** GET /scheduled?page=&size= */
  getScheduled: (page = 0, size = 20) =>
    apiGet<NotificationLog[]>('/api/v1/notifications/scheduled', { page, size }),

  // ── Actions ────────────────────────────────────────────────────────────

  /** POST /send (all fields as query params) */
  sendEvent: (
    eventType: string,
    customerId: number,
    email?: string,
    phone?: string,
    name?: string,
    extraParams?: Record<string, string>,
  ) => {
    const url = withParams('/api/v1/notifications/send', {
      eventType,
      customerId,
      email,
      phone,
      name,
      ...extraParams,
    });
    return apiPost<unknown>(url);
  },

  /** POST /send-direct — send a direct (non-template) notification */
  sendDirect: (payload: SendDirectRequest) =>
    apiPost<NotificationLog>('/api/v1/notifications/send-direct', payload),

  /** POST /send-bulk — send bulk notifications (CBS_ADMIN only) */
  sendBulk: (payload: SendBulkRequest) =>
    apiPost<{ sent: number; failed: number }>('/api/v1/notifications/send-bulk', payload),

  /** GET /retry — get retry status (pending/failed counts) */
  getRetryStatus: () =>
    apiGet<{ pending: number; failed: number }>('/api/v1/notifications/retry'),

  /** POST /retry */
  retry: () =>
    apiPost<{ retried: number }>('/api/v1/notifications/retry'),

  // ── Preferences ────────────────────────────────────────────────────────

  /** GET /preferences/{customerId} */
  getPreferences: (customerId: number) =>
    apiGet<NotificationPreference[]>(`/api/v1/notifications/preferences/${customerId}`),

  /** PUT /preferences?customerId=&channel=&eventType=&enabled= */
  updatePreference: (customerId: number, channel: string, eventType: string, enabled: boolean) => {
    const url = withParams('/api/v1/notifications/preferences', {
      customerId,
      channel,
      eventType,
      enabled,
    });
    return apiPut<NotificationPreference>(url);
  },
};
