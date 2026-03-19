import { apiGet } from '@/lib/api';

export interface AuditEntry {
  id: number;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';
  entityType: string;
  entityId: string;
  description: string;
  ipAddress: string;
  sessionId: string;
  changes?: FieldChange[];
}

export interface FieldChange {
  field: string;
  before: string | null;
  after: string | null;
}

export interface AuditSearchParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  ipAddress?: string;
  page?: number;
  size?: number;
}

export interface AuditSummary {
  totalResults: number;
  creates: number;
  updates: number;
  deletes: number;
  approvals: number;
}

export interface UserActivityDay {
  date: string;
  hour: number;
  count: number;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  logoutTime?: string;
  duration?: string;
  actionCount: number;
  concurrentSessionFlag: boolean;
}

export const auditApi = {
  search: (params: AuditSearchParams) => apiGet<AuditEntry[]>('/api/v1/audit/search', params as Record<string, unknown>),
  getSummary: (params: AuditSearchParams) => apiGet<AuditSummary>('/api/v1/audit/summary', params as Record<string, unknown>),
  getEntry: (id: number) => apiGet<AuditEntry>(`/api/v1/audit/${id}`),
  getRelatedEntries: (entityType: string, entityId: string, timestamp: string) =>
    apiGet<AuditEntry[]>('/api/v1/audit/related', { entityType, entityId, timestamp }),
  getUserActivity: (userId: string, dateFrom: string, dateTo: string) =>
    apiGet<AuditEntry[]>('/api/v1/audit/user-activity', { userId, dateFrom, dateTo }),
  getUserHeatmap: (userId: string, days?: number) =>
    apiGet<UserActivityDay[]>('/api/v1/audit/user-heatmap', { userId, days: days || 30 }),
  getSession: (sessionId: string) =>
    apiGet<SessionInfo>(`/api/v1/audit/sessions/${sessionId}`),
  getSessionActions: (sessionId: string) =>
    apiGet<AuditEntry[]>(`/api/v1/audit/sessions/${sessionId}/actions`),
};
