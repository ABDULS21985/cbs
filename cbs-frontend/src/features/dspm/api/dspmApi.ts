import { apiGet, apiGetPaged, apiPost, apiPostParams, apiPut } from '@/lib/api';
import type {
  DspmDataSource, DspmScan, DspmPolicy, DspmException,
  DspmIdentity, DspmAccessAudit,
} from '../types/dspm';

export const dspmApi = {
  // ── Data Sources ─────────────────────────────────────────────────────────
  listSources: () => apiGet<DspmDataSource[]>('/api/v1/dspm/sources'),
  createSource: (data: Partial<DspmDataSource>) => apiPost<DspmDataSource>('/api/v1/dspm/sources', data),
  getSource: (code: string) => apiGet<DspmDataSource>(`/api/v1/dspm/sources/${code}`),

  // ── Scans (configurable: scope, assetTypes, fullScan sent in body) ─────
  listScans: () => apiGet<DspmScan[]>('/api/v1/dspm/scans'),
  startScan: (data: { scope?: string; assetTypes?: string[]; fullScan?: boolean; sourceId?: number }) =>
    apiPost<DspmScan>('/api/v1/dspm/scans', data),
  completeScan: (code: string, findings: Record<string, number>) =>
    apiPostParams<DspmScan>(`/api/v1/dspm/scans/${code}/complete`, findings),

  // ── Policies (full rule config in body) ────────────────────────────────
  listPolicies: () => apiGet<DspmPolicy[]>('/api/v1/dspm/policies'),
  createPolicy: (data: Partial<DspmPolicy>) => apiPost<DspmPolicy>('/api/v1/dspm/policies', data),
  updatePolicy: (code: string, data: Partial<DspmPolicy>) => apiPut<DspmPolicy>(`/api/v1/dspm/policies/${code}`, data),
  activatePolicy: (code: string) => apiPost<DspmPolicy>(`/api/v1/dspm/policies/${code}/activate`),

  // ── Exceptions (sortable: sortBy, order params) ────────────────────────
  listExceptions: (params?: { page?: number; size?: number; status?: string; sortBy?: string; order?: string }) =>
    apiGet<DspmException[]>('/api/v1/dspm/exceptions', params as Record<string, unknown>),
  createException: (data: Partial<DspmException>) => apiPost<DspmException>('/api/v1/dspm/exceptions', data),
  approveException: (code: string, approvedBy: string) =>
    apiPostParams<DspmException>(`/api/v1/dspm/exceptions/${code}/approve`, { approvedBy }),
  rejectException: (code: string) =>
    apiPost<DspmException>(`/api/v1/dspm/exceptions/${code}/reject`),

  // ── Identities ─────────────────────────────────────────────────────────
  listIdentities: () => apiGet<DspmIdentity[]>('/api/v1/dspm/identities'),
  getIdentity: (code: string) => apiGet<DspmIdentity>(`/api/v1/dspm/identities/${code}`),
  createIdentity: (data: Partial<DspmIdentity>) => apiPost<DspmIdentity>('/api/v1/dspm/identities', data),

  // ── Access Audit (identity audit trail) ────────────────────────────────
  getIdentityAudit: (code: string, params?: { page?: number; size?: number }) =>
    apiGet<DspmAccessAudit[]>(`/api/v1/dspm/identities/${code}/audit`, params as Record<string, unknown>),
  /** Paged variant — returns both the audit records and PageMeta for accurate pagination UI */
  getIdentityAuditPaged: (code: string, params?: { page?: number; size?: number }) =>
    apiGetPaged<DspmAccessAudit[]>(`/api/v1/dspm/identities/${code}/audit`, params as Record<string, unknown>),
  listRiskyAccess: () => apiGet<DspmAccessAudit[]>('/api/v1/dspm/audit'),
  recordAccess: (data: Partial<DspmAccessAudit>) => apiPost<DspmAccessAudit>('/api/v1/dspm/audit', data),
};
