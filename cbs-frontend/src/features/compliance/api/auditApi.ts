import { apiGet } from '@/lib/api';

export interface AuditEntry {
  id: number;
  eventType: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  performedFromIp?: string;
  sessionId?: string;
  channel?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT' | 'EXPORT';
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  changedFields?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  eventTimestamp: string;
  createdAt: string;
}

export interface AuditSearchParams {
  entityType?: string;
  action?: string;
  performedBy?: string;
  eventType?: string;
  page?: number;
  size?: number;
}

export interface AuditSummaryData {
  totalEvents: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Record<string, number>;
}

export interface UserActivityHeatmapData {
  userId: string;
  totalEvents: number;
  heatmap: Record<string, Record<string, number>>;
}

export const auditApi = {
  search: (params: AuditSearchParams) =>
    apiGet<AuditEntry[]>('/api/v1/audit/search', params as Record<string, unknown>),

  getSummary: () =>
    apiGet<AuditSummaryData>('/api/v1/audit/summary'),

  getRelatedEntries: (entityType: string, entityId: string) =>
    apiGet<AuditEntry[]>('/api/v1/audit/related', { entityType, entityId }),

  getUserActivity: (userId: string) =>
    apiGet<AuditEntry[]>('/api/v1/audit/user-activity', { userId }),

  getUserHeatmap: (userId: string) =>
    apiGet<UserActivityHeatmapData>('/api/v1/audit/user-heatmap', { userId }),
};
