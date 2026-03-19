import { apiGet, apiPost, apiPut } from '@/lib/api';

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
  deliveryStatus: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
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

export interface DeliveryStats {
  totalSent: number;
  delivered: number;
  failed: number;
  bounced: number;
  deliveryRate: number;
}

export const communicationApi = {
  getByCustomer: (customerId: number) =>
    apiGet<Communication[]>(`/api/v1/communications/customer/${customerId}`),
  getAll: (filters?: Record<string, unknown>) =>
    apiGet<Communication[]>('/api/v1/communications', filters),
  send: (data: Partial<Communication>) =>
    apiPost<Communication>('/api/v1/communications', data),
  schedule: (data: Partial<Communication> & { scheduledAt: string }) =>
    apiPost<Communication>('/api/v1/communications/schedule', data),
  getTemplates: () =>
    apiGet<CommTemplate[]>('/api/v1/communication-templates'),
  createTemplate: (data: Partial<CommTemplate>) =>
    apiPost<CommTemplate>('/api/v1/communication-templates', data),
  updateTemplate: (id: number, data: Partial<CommTemplate>) =>
    apiPut<CommTemplate>(`/api/v1/communication-templates/${id}`, data),
  getPreferences: (customerId: number) =>
    apiGet<ChannelPreference[]>(`/api/v1/communications/preferences/${customerId}`),
  updatePreference: (customerId: number, pref: ChannelPreference) =>
    apiPut<void>(`/api/v1/communications/preferences/${customerId}`, pref),
  getDeliveryStats: (params?: Record<string, unknown>) =>
    apiGet<DeliveryStats>('/api/v1/communications/stats', params),
};
