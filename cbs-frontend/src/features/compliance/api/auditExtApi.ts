import { apiGet } from '@/lib/api';
import type { AuditEvent } from '../types/auditExt';

export const auditApi = {
  /** GET /v1/audit/entity/{entityType}/{entityId} */
  getEntityTrail: (entityType: string, entityId: number) =>
    apiGet<AuditEvent[]>(`/api/v1/audit/entity/${entityType}/${entityId}`),

  /** GET /v1/audit/user/{performedBy} */
  getUserTrail: (performedBy: string) =>
    apiGet<AuditEvent[]>(`/api/v1/audit/user/${performedBy}`),

  /** GET /v1/audit/action/{action} */
  getByAction: (action: string) =>
    apiGet<AuditEvent[]>(`/api/v1/audit/action/${action}`),

};
