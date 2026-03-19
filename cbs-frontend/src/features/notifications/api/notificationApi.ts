import { apiGet, apiPost } from '@/lib/api';
import type { AppNotification } from '@/stores/notificationStore';

export const notificationApi = {
  getAll: (page = 0, size = 20) => apiGet<AppNotification[]>('/api/v1/notifications', { page, size }),
  getUnreadCount: () => apiGet<number>('/api/v1/notifications/unread-count'),
  markAsRead: (id: string) => apiPost<void>(`/api/v1/notifications/${id}/read`),
  markAllAsRead: () => apiPost<void>('/api/v1/notifications/mark-all-read'),
  delete: (id: string) => apiPost<void>(`/api/v1/notifications/${id}/delete`),
};
