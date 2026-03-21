import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ─── Types (aligned with backend NotificationTemplate entity) ───────────────

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
export type NotificationCategory = 'TRANSACTION' | 'ACCOUNT' | 'LOAN' | 'CARD' | 'SECURITY' | 'MARKETING' | 'SYSTEM';
export type TemplateStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface NotificationTemplate {
  id: number;
  templateCode: string;
  templateName: string;
  channel: NotificationChannel;
  eventType: string;
  subject?: string;
  bodyTemplate: string;
  isHtml: boolean;
  locale: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  provider: string;
  config?: Record<string, unknown>;
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

export interface DeliveryTrendEntry {
  date: string;
  delivered: number;
  failed: number;
  pending: number;
}

export interface DeliveryByChannelEntry {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
}

export interface FailureRecord {
  id: number;
  templateCode: string;
  channel: NotificationChannel;
  recipientAddress: string;
  failureReason: string;
  createdAt: string;
  status: string;
}

export interface ScheduledNotification {
  id: number;
  name: string;
  templateCode?: string;
  channel: NotificationChannel;
  eventType?: string;
  subject?: string;
  body?: string;
  cronExpression?: string;
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextRun?: string;
  lastRun?: string;
  recipientCriteria?: Record<string, unknown>;
  recipientCount: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface TemplatePreview {
  subject: string;
  body: string;
  channel: string;
  isHtml: boolean;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getTemplates(params?: {
  channel?: NotificationChannel;
  category?: string;
  status?: string;
  search?: string;
}): Promise<NotificationTemplate[]> {
  return apiGet<NotificationTemplate[]>('/api/v1/notifications/templates', params as unknown as Record<string, unknown>);
}

export function getTemplateById(id: number | string): Promise<NotificationTemplate> {
  return apiGet<NotificationTemplate>(`/api/v1/notifications/templates/${id}`);
}

export function createTemplate(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>('/api/v1/notifications/templates', data);
}

export function updateTemplate(id: number | string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
  return apiPut<NotificationTemplate>(`/api/v1/notifications/templates/${id}`, data);
}

export function publishTemplate(id: number | string): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}/publish`);
}

export function archiveTemplate(id: number | string): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}/archive`);
}

export function testSendTemplate(id: number | string, recipient: string): Promise<{ success: boolean; recipient: string; subject: string; body: string }> {
  return apiPost(`/api/v1/notifications/templates/${id}/test`, { recipient });
}

export function previewTemplate(id: number | string): Promise<TemplatePreview> {
  return apiGet<TemplatePreview>(`/api/v1/notifications/templates/${id}/preview`);
}

// ─── Channels ─────────────────────────────────────────────────────────────────

export function getChannelConfigs(): Promise<ChannelConfig[]> {
  return apiGet<ChannelConfig[]>('/api/v1/notifications/channels');
}

export function updateChannelConfig(channel: NotificationChannel, data: Partial<ChannelConfig>): Promise<ChannelConfig> {
  return apiPut<ChannelConfig>(`/api/v1/notifications/channels/${channel}`, data);
}

export function testChannelSend(channel: NotificationChannel, recipient: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return apiPost(`/api/v1/notifications/channels/${channel}/test`, { recipient });
}

// ─── Delivery Stats ───────────────────────────────────────────────────────────

export function getDeliveryStats(days?: number): Promise<DeliveryStats> {
  return apiGet<DeliveryStats>('/api/v1/notifications/delivery-stats', days ? { days } : undefined);
}

export function getDeliveryTrend(): Promise<DeliveryTrendEntry[]> {
  return apiGet<DeliveryTrendEntry[]>('/api/v1/notifications/delivery-stats/trend');
}

export function getDeliveryByChannel(): Promise<DeliveryByChannelEntry[]> {
  return apiGet<DeliveryByChannelEntry[]>('/api/v1/notifications/delivery-stats/by-channel');
}

export function getDeliveryFailures(): Promise<FailureRecord[]> {
  return apiGet<FailureRecord[]>('/api/v1/notifications/delivery-stats/failures');
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  return apiGet<ScheduledNotification[]>('/api/v1/notifications/scheduled');
}

export function toggleSchedule(id: number | string): Promise<ScheduledNotification> {
  return apiPut<ScheduledNotification>(`/api/v1/notifications/scheduled/${id}/toggle`);
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export function sendNotification(data: { templateId: number; recipients: string[]; mergeData: Record<string, string> }): Promise<unknown> {
  return apiPost('/api/v1/notifications/send', data);
}
// ─── Template Versions ───────────────────────────────────────────────────────

export interface TemplateVersionEntry {
  id: number;
  templateId: number;
  versionNumber: number;
  bodyTemplate: string;
  subject?: string;
  changedBy?: string;
  changeSummary?: string;
  createdAt: string;
}

export function getTemplateVersions(id: number | string): Promise<TemplateVersionEntry[]> {
  return apiGet<TemplateVersionEntry[]>(`/api/v1/notifications/templates/${id}/versions`);
}

export function getFailureRecords(page = 0, size = 20): Promise<FailureRecord[]> {
  return apiGet<FailureRecord[]>('/api/v1/notifications/failures', { page, size });
}

export function createScheduledNotification(data: Partial<ScheduledNotification> & { recipientCriteria?: Record<string, unknown> }): Promise<ScheduledNotification> {
  return apiPost<ScheduledNotification>('/api/v1/notifications/scheduled', data);
}

export function deleteScheduledNotification(id: number | string): Promise<{ id: string; deleted: string }> {
  return apiDelete<{ id: string; deleted: string }>(`/api/v1/notifications/scheduled/${id}`);
}
