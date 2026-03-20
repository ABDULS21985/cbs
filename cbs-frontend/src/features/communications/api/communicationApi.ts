import { apiGet, apiPost, apiPut } from '@/lib/api';

// ── Types matching backend NotificationLog entity ────────────────────────────

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'READ' | 'SCHEDULED';

export interface NotificationLog {
  id: number;
  templateCode: string | null;
  channel: NotificationChannel;
  eventType: string | null;
  customerId: number | null;
  recipientAddress: string | null;
  recipientName: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  provider: string | null;
  providerMessageId: string | null;
  failureReason: string | null;
  retryCount: number;
  maxRetries: number;
  scheduledAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface NotificationTemplate {
  id: number;
  templateCode: string;
  templateName: string;
  channel: NotificationChannel;
  eventType: string;
  subject: string | null;
  bodyTemplate: string;
  isHtml: boolean;
  locale: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface ChannelConfig {
  channel: string;
  provider: string;
  enabled: boolean;
}

export interface DeliveryStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRatePct: number;
  failureRatePct: number;
}

export interface TrendEntry {
  date: string;
  delivered: number;
  failed: number;
  pending: number;
}

export interface ChannelStats {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
}

// Legacy type for backward compatibility
export interface Communication {
  id: number;
  customerId: number;
  customerName: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'LETTER';
  direction: 'OUTBOUND' | 'INBOUND';
  subject?: string;
  messagePreview: string;
  messageContent: string;
  templateId?: number;
  templateName?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  deliveryStatus: DeliveryStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface CommTemplate {
  id: number;
  name: string;
  category: string;
  channel: Communication['channel'];
  subject?: string;
  content: string;
  mergeFields: string[];
  usageCount: number;
  version: number;
  isActive: boolean;
}

export interface ChannelPreference {
  channel: Communication['channel'];
  category: string;
  enabled: boolean;
}

// ── Routing Rule types (backend RoutingRule entity) ─────────────────────────

export interface RoutingRule {
  id: number;
  ruleName: string;
  ruleType: string;
  priority: number;
  conditions: Record<string, unknown> | null;
  targetQueue: string | null;
  targetSkillGroup: string | null;
  targetAgentId: string | null;
  fallbackRuleId: number | null;
  maxWaitBeforeFallback: number | null;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id?: number;
  customerId: number;
  channel: string;
  eventType: string;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── API — aligned to real backend endpoints ──────────────────────────────────

export const communicationApi = {
  // Communications controller
  getAll: (filters?: Record<string, unknown>) =>
    apiGet<Communication[]>('/api/v1/communications', filters).catch(() => []),
  getStats: () =>
    apiGet<{ total: number; sent: number; delivered: number; failed: number; pending: number }>('/api/v1/communications/stats'),
  getScheduled: () =>
    apiGet<Communication[]>('/api/v1/communications/schedule').catch(() => []),
  getByCustomer: (customerId: number) =>
    apiGet<Communication[]>(`/api/v1/communications/customer/${customerId}`).catch(() => []),

  // Legacy template endpoints
  getTemplates: () =>
    apiGet<CommTemplate[]>('/api/v1/communications/templates').catch(() => []),
  getDeliveryStats: (params?: Record<string, unknown>) =>
    apiGet<DeliveryStats>('/api/v1/communications/stats', params),

  // Preferences
  getPreferences: (customerId: number) =>
    apiGet<ChannelPreference[]>(`/api/v1/communications/preferences/${customerId}`).catch(() => []),
  updatePreference: (customerId: number, pref: ChannelPreference) =>
    apiPut<void>(`/api/v1/communications/preferences/${customerId}`, pref),
};

// ── Notification API — primary endpoints ─────────────────────────────────────

export const notificationApi = {
  // List
  list: (params?: { search?: string; page?: number; size?: number }) =>
    apiGet<NotificationLog[]>('/api/v1/notifications', params as Record<string, unknown>).catch(() => []),

  // Send
  send: (params: { eventType: string; customerId?: number; email?: string; phone?: string; name?: string }, body: Record<string, string>) =>
    apiPost<NotificationLog[]>(
      `/api/v1/notifications/send?eventType=${encodeURIComponent(params.eventType)}${params.customerId ? `&customerId=${params.customerId}` : ''}${params.email ? `&email=${encodeURIComponent(params.email)}` : ''}${params.phone ? `&phone=${encodeURIComponent(params.phone)}` : ''}${params.name ? `&name=${encodeURIComponent(params.name)}` : ''}`,
      body,
    ),

  // Direct send (custom message without template)
  sendDirect: (data: { channel: string; recipientAddress: string; recipientName: string; subject: string; body: string; customerId?: number; eventType?: string }) =>
    apiPost<NotificationLog>('/api/v1/notifications/send-direct', data),

  // Bulk send
  sendBulk: (data: { channel: string; subject: string; body: string; eventType?: string; recipients: { address: string; name: string; customerId?: number }[] }) =>
    apiPost<{ sent: number; failed: number; total: number }>('/api/v1/notifications/send-bulk', data),

  // Customer
  getCustomerNotifications: (customerId: number, page = 0, size = 20) =>
    apiGet<NotificationLog[]>(`/api/v1/notifications/customer/${customerId}`, { page, size } as Record<string, unknown>).catch(() => []),

  // Stats
  getDeliveryStats: () =>
    apiGet<DeliveryStats>('/api/v1/notifications/delivery-stats'),
  getDeliveryTrend: () =>
    apiGet<TrendEntry[]>('/api/v1/notifications/delivery-stats/trend').catch(() => []),
  getDeliveryByChannel: () =>
    apiGet<ChannelStats[]>('/api/v1/notifications/delivery-stats/by-channel').catch(() => []),
  getDeliveryFailures: () =>
    apiGet<NotificationLog[]>('/api/v1/notifications/delivery-stats/failures').catch(() => []),

  // Failures
  getFailures: (page = 0, size = 20) =>
    apiGet<NotificationLog[]>('/api/v1/notifications/failures', { page, size } as Record<string, unknown>).catch(() => []),

  // Retry
  retryFailed: () =>
    apiPost<{ retried: number }>('/api/v1/notifications/retry'),

  // Scheduled
  getScheduled: (page = 0, size = 20) =>
    apiGet<NotificationLog[]>('/api/v1/notifications/scheduled', { page, size } as Record<string, unknown>).catch(() => []),

  // Unread
  getUnreadCount: (customerId?: number) =>
    apiGet<{ unreadCount: number }>('/api/v1/notifications/unread-count', customerId ? { customerId } as Record<string, unknown> : undefined),

  // Mark read
  markAllRead: (customerId: number) =>
    apiPost<{ markedAsRead: number }>(`/api/v1/notifications/mark-all-read?customerId=${customerId}`),

  // Channels
  getChannels: () =>
    apiGet<ChannelConfig[]>('/api/v1/notifications/channels').catch(() => []),

  // Templates
  getTemplates: () =>
    apiGet<NotificationTemplate[]>('/api/v1/notifications/templates').catch(() => []),
  getTemplate: (id: number) =>
    apiGet<NotificationTemplate>(`/api/v1/notifications/templates/${id}`),
  createTemplate: (data: Partial<NotificationTemplate>) =>
    apiPost<NotificationTemplate>('/api/v1/notifications/templates', data),
  updateTemplate: (id: number, data: Partial<NotificationTemplate>) =>
    apiPut<NotificationTemplate>(`/api/v1/notifications/templates/${id}`, data),
  previewTemplate: (id: number) =>
    apiGet<{ subject: string; body: string; channel: string; isHtml: boolean }>(`/api/v1/notifications/templates/${id}/preview`),

  // Channel management
  updateChannel: (channel: string, data: Record<string, unknown>) =>
    apiPut<ChannelConfig>(`/api/v1/notifications/channels/${channel}`, data),
  testChannel: (channel: string, recipient: string) =>
    apiPost<{ success: boolean; messageId?: string }>(`/api/v1/notifications/channels/${channel}/test`, { recipient }),

  // Preferences (notification-level)
  getNotificationPreferences: (customerId?: number) =>
    apiGet<NotificationPreference[]>('/api/v1/notifications/preferences', customerId ? { customerId } as Record<string, unknown> : undefined).catch(() => []),
  getCustomerPreferences: (customerId: number) =>
    apiGet<NotificationPreference[]>(`/api/v1/notifications/preferences/${customerId}`).catch(() => []),
  updateNotificationPreference: (customerId: number, channel: string, eventType: string, enabled: boolean) =>
    apiPut<NotificationPreference>(`/api/v1/notifications/preferences?customerId=${customerId}&channel=${encodeURIComponent(channel)}&eventType=${encodeURIComponent(eventType)}&enabled=${enabled}`),
};

// ── Routing API — contact routing rules ─────────────────────────────────────

export const routingApi = {
  getRules: () =>
    apiGet<RoutingRule[]>('/api/v1/contact-routing/rules').catch(() => []),
  createRule: (data: Partial<RoutingRule>) =>
    apiPost<RoutingRule>('/api/v1/contact-routing/rules', data),
  routeContact: (customerId: number, reason: string, channel: string) =>
    apiPost<Record<string, string>>(`/api/v1/contact-routing/route?customerId=${customerId}&reason=${encodeURIComponent(reason)}&channel=${encodeURIComponent(channel)}`),
};
