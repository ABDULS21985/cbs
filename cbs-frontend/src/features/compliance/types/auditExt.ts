// Auto-generated from backend entities

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT' | 'EXPORT';

export interface AuditEvent {
  id: number;
  eventType: string;
  entityType: string;
  entityId: number;
  performedBy: string;
  performedFromIp: string;
  sessionId: string;
  channel: string;
  action: AuditAction;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  changedFields: string[];
  description: string;
  metadata: Record<string, unknown>;
  eventTimestamp: string;
  createdAt: string;
}

