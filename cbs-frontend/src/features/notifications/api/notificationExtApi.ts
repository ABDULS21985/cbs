import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { NotificationLog, NotificationPreference } from '../types/notificationExt';

export const notificationsApi = {
  /** POST /v1/notifications/send */
  sendEvent: (data: Record<string, unknown>) =>
    apiPost<NotificationLog[]>('/api/v1/notifications/send', data),

  /** PUT /v1/notifications/preferences */
  updatePreference: () =>
    apiPut<NotificationPreference>('/api/v1/notifications/preferences'),

  /** GET /v1/notifications/preferences/{customerId} */
  getPreferences: (customerId: number) =>
    apiGet<NotificationPreference[]>(`/api/v1/notifications/preferences/${customerId}`),

  /** POST /v1/notifications/retry */
  retry: () =>
    apiPost<Record<string, unknown>>('/api/v1/notifications/retry'),

};
