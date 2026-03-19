import { apiGet, apiPost } from '@/lib/api';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
export type NotificationCategory = 'TRANSACTION' | 'ACCOUNT' | 'LOAN' | 'CARD' | 'SECURITY' | 'MARKETING' | 'SYSTEM';
export type TemplateStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  subject?: string;
  body: string;
  language: 'EN' | 'YO' | 'HA' | 'IG';
  usageMTD: number;
  status: TemplateStatus;
  version: number;
  lastEditedBy: string;
  updatedAt: string;
  createdAt: string;
}

export interface TemplateVersion {
  version: number;
  editedBy: string;
  editedAt: string;
  subject?: string;
  body: string;
  changeNote: string;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  provider: string;
  fromAddress?: string;
  fromName?: string;
  senderId?: string;
  dailyLimit: number;
  sentToday: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DEGRADED';
  costPerUnit?: number;
}

export interface DeliveryStats {
  date: string;
  channel: NotificationChannel;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  cost?: number;
}

export interface FailureRecord {
  templateCode: string;
  templateName: string;
  channel: NotificationChannel;
  failures: number;
  commonError: string;
  lastFailure: string;
}

export interface ScheduledNotification {
  id: string;
  name: string;
  templateCode: string;
  templateName: string;
  channel: NotificationChannel;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextRun: string;
  lastRun?: string;
  recipientCount: number;
  status: 'ACTIVE' | 'PAUSED';
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getTemplates(params?: {
  channel?: NotificationChannel;
  category?: NotificationCategory;
  status?: TemplateStatus;
  search?: string;
}): Promise<NotificationTemplate[]> {
  return apiGet<NotificationTemplate[]>('/api/v1/notifications/templates', params as Record<string, unknown>).catch(() => []);
}

export function getTemplateById(id: string): Promise<NotificationTemplate> {
  return apiGet<NotificationTemplate>(`/api/v1/notifications/templates/${id}`);
}

export function createTemplate(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>('/api/v1/notifications/templates', data);
}

export function updateTemplate(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}`, data);
}

export function publishTemplate(id: string): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}/publish`);
}

export function archiveTemplate(id: string): Promise<NotificationTemplate> {
  return apiPost<NotificationTemplate>(`/api/v1/notifications/templates/${id}/archive`);
}

export function getTemplateVersions(id: string): Promise<TemplateVersion[]> {
  return apiGet<TemplateVersion[]>(`/api/v1/notifications/templates/${id}/versions`).catch(() => []);
}

export function getChannelConfigs(): Promise<ChannelConfig[]> {
  return apiGet<ChannelConfig[]>('/api/v1/notifications/channels').catch(() => []);
}

export function updateChannelConfig(channel: NotificationChannel, data: Partial<ChannelConfig>): Promise<ChannelConfig> {
  return apiPost<ChannelConfig>(`/api/v1/notifications/channels/${channel}`, data);
}

export function testChannelSend(channel: NotificationChannel, recipient: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return apiPost<{ success: boolean; messageId?: string; error?: string }>(`/api/v1/notifications/channels/${channel}/test`, { recipient });
}

export function getDeliveryStats(days = 30): Promise<DeliveryStats[]> {
  return apiGet<DeliveryStats[]>('/api/v1/notifications/delivery-stats', { days }).catch(() => []);
}

export function getFailureRecords(): Promise<FailureRecord[]> {
  return apiGet<FailureRecord[]>('/api/v1/notifications/failures').catch(() => []);
}

export function getScheduledNotifications(): Promise<ScheduledNotification[]> {
  return apiGet<ScheduledNotification[]>('/api/v1/notifications/scheduled').catch(() => []);
}

export function createScheduledNotification(data: Partial<ScheduledNotification>): Promise<ScheduledNotification> {
  return apiPost<ScheduledNotification>('/api/v1/notifications/scheduled', data);
}

export function toggleSchedule(id: string): Promise<ScheduledNotification> {
  return apiPost<ScheduledNotification>(`/api/v1/notifications/scheduled/${id}/toggle`);
}
