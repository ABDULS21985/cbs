import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ── Types matching backend NotificationLog entity ────────────────────────────

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
export type DeliveryStatus = 'PENDING' | 'PENDING_DISPATCH' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'READ' | 'SCHEDULED';

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
  version?: number;
}

export interface ChannelConfig {
  id: number;
  channel: string;
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
  senderAddress: string | null;
  apiKey: string | null;
  apiSecret: string | null;
  webhookUrl: string | null;
  rateLimit: number;
  retryEnabled: boolean;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
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

// ── Scheduled Notification type (backend ScheduledNotification entity) ──────

export interface ScheduledNotification {
  id: number;
  name: string;
  templateCode: string | null;
  channel: NotificationChannel;
  eventType: string | null;
  subject: string | null;
  body: string | null;
  cronExpression: string | null;
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextRun: string | null;
  lastRun: string | null;
  recipientCriteria: Record<string, unknown> | null;
  recipientCount: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  version: number | null;
}

// ── Template Version type ──────────────────────────────────────────────────

export interface TemplateVersionEntry {
  id: number;
  templateId: number;
  versionNumber: number;
  bodyTemplate: string;
  subject: string | null;
  changedBy: string | null;
  changeSummary: string | null;
  createdAt: string;
}

// ── Template Preview type ──────────────────────────────────────────────────

export interface TemplatePreview {
  subject: string;
  body: string;
  channel: string;
  isHtml: boolean;
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
    apiGet<Communication[]>('/api/v1/communications', filters),
  getStats: () =>
    apiGet<{ total: number; sent: number; delivered: number; failed: number; pending: number }>('/api/v1/communications/stats'),
  getScheduled: () =>
    apiGet<Communication[]>('/api/v1/communications/schedule'),
  getByCustomer: (customerId: number) =>
    apiGet<Communication[]>(`/api/v1/communications/customer/${customerId}`),

  // Legacy template endpoints
  getTemplates: () =>
    apiGet<CommTemplate[]>('/api/v1/communications/templates'),
  getDeliveryStats: (params?: Record<string, unknown>) =>
    apiGet<DeliveryStats>('/api/v1/communications/stats', params),

  // Preferences
  getPreferences: (customerId: number) =>
    apiGet<ChannelPreference[]>(`/api/v1/communications/preferences/${customerId}`),
  updatePreference: (customerId: number, pref: ChannelPreference) =>
    apiPut<void>(`/api/v1/communications/preferences/${customerId}`, pref),
};

// ── Notification API — primary endpoints ─────────────────────────────────────

export const notificationApi = {
  // List
  list: (params?: { search?: string; page?: number; size?: number }) =>
    apiGet<NotificationLog[]>('/api/v1/notifications', params as Record<string, unknown>),

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
    apiGet<NotificationLog[]>(`/api/v1/notifications/customer/${customerId}`, { page, size } as Record<string, unknown>),

  // Stats
  getDeliveryStats: () =>
    apiGet<DeliveryStats>('/api/v1/notifications/delivery-stats'),
  getDeliveryTrend: () =>
    apiGet<TrendEntry[]>('/api/v1/notifications/delivery-stats/trend'),
  getDeliveryByChannel: () =>
    apiGet<ChannelStats[]>('/api/v1/notifications/delivery-stats/by-channel'),
  getDeliveryFailures: () =>
    apiGet<NotificationLog[]>('/api/v1/notifications/delivery-stats/failures'),

  // Failures
  getFailures: (page = 0, size = 20) =>
    apiGet<NotificationLog[]>('/api/v1/notifications/failures', { page, size } as Record<string, unknown>),

  // Retry
  retryFailed: () =>
    apiPost<{ retried: number }>('/api/v1/notifications/retry'),

  // Scheduled campaigns
  getScheduled: (page = 0, size = 20) =>
    apiGet<ScheduledNotification[]>('/api/v1/notifications/scheduled', { page, size } as Record<string, unknown>),
  createScheduled: (data: Partial<ScheduledNotification>) =>
    apiPost<ScheduledNotification>('/api/v1/notifications/scheduled', data),
  deleteScheduled: (id: number) =>
    apiDelete<{ id: string; deleted: string }>(`/api/v1/notifications/scheduled/${id}`),
  toggleScheduled: (id: number) =>
    apiPut<ScheduledNotification>(`/api/v1/notifications/scheduled/${id}/toggle`),

  // Unread
  getUnreadCount: (customerId?: number) =>
    apiGet<{ unreadCount: number }>('/api/v1/notifications/unread-count', customerId ? { customerId } as Record<string, unknown> : undefined),

  // Mark read
  markAllRead: (customerId: number) =>
    apiPost<{ markedAsRead: number }>(`/api/v1/notifications/mark-all-read?customerId=${customerId}`),

  // Channels
  getChannels: () =>
    apiGet<ChannelConfig[]>('/api/v1/notifications/channels'),

  // Templates
  getTemplates: () =>
    apiGet<NotificationTemplate[]>('/api/v1/notifications/templates'),
  getTemplate: (id: number) =>
    apiGet<NotificationTemplate>(`/api/v1/notifications/templates/${id}`),
  createTemplate: (data: Partial<NotificationTemplate>) =>
    apiPost<NotificationTemplate>('/api/v1/notifications/templates', data),
  updateTemplate: (id: number, data: Partial<NotificationTemplate>) =>
    apiPut<NotificationTemplate>(`/api/v1/notifications/templates/${id}`, data),
  previewTemplate: (id: number) =>
    apiGet<{ subject: string; body: string; channel: string; isHtml: boolean }>(`/api/v1/notifications/templates/${id}/preview`),
  cloneTemplate: (id: number) =>
    apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}/clone`),
  publishTemplate: (id: number) =>
    apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}/publish`),
  archiveTemplate: (id: number) =>
    apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}/archive`),
  testTemplate: (id: number, recipient: string) =>
    apiPost<{ success: boolean; recipient: string; subject: string; body: string }>(`/api/v1/notifications/templates/${id}/test`, { recipient }),
  getTemplateVersions: (id: number) =>
    apiGet<Array<{ id: number; templateId: number; versionNumber: number; bodyTemplate: string; subject: string; changedBy: string; changeSummary: string; createdAt: string }>>(`/api/v1/notifications/templates/${id}/versions`),

  // Send by template (admin/compose flow using template ID + merge data + recipients)
  sendByTemplate: (data: { templateId: number; recipients: string[]; mergeData: Record<string, string> }) =>
    apiPost<{ sent: number; failed: number; total: number }>('/api/v1/notifications/send-by-template', data),

  // Channel management
  updateChannel: (channel: string, data: Record<string, unknown>) =>
    apiPut<ChannelConfig>(`/api/v1/notifications/channels/${channel}`, data),
  testChannel: (channel: string, recipient: string) =>
    apiPost<{ success: boolean; messageId?: string }>(`/api/v1/notifications/channels/${channel}/test`, { recipient }),

  // Preferences (notification-level)
  getNotificationPreferences: (customerId?: number) =>
    apiGet<NotificationPreference[]>('/api/v1/notifications/preferences', customerId ? { customerId } as Record<string, unknown> : undefined),
  getCustomerPreferences: (customerId: number) =>
    apiGet<NotificationPreference[]>(`/api/v1/notifications/preferences/${customerId}`),
  updateNotificationPreference: (customerId: number, channel: string, eventType: string, enabled: boolean) =>
    apiPut<NotificationPreference>(`/api/v1/notifications/preferences?customerId=${customerId}&channel=${encodeURIComponent(channel)}&eventType=${encodeURIComponent(eventType)}&enabled=${enabled}`),
};

// ── Routing API — contact routing rules ─────────────────────────────────────

export const routingApi = {
  getRules: () =>
    apiGet<RoutingRule[]>('/api/v1/contact-routing/rules'),
  createRule: (data: Partial<RoutingRule>) =>
    apiPost<RoutingRule>('/api/v1/contact-routing/rules', data),
  routeContact: (customerId: number, reason: string, channel: string) =>
    apiPost<Record<string, string>>(`/api/v1/contact-routing/route?customerId=${customerId}&reason=${encodeURIComponent(reason)}&channel=${encodeURIComponent(channel)}`),
};
