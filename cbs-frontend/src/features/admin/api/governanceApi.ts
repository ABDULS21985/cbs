import { apiGet, apiPatchParams, apiPost } from '@/lib/api';
import type { SystemParameter, ParameterAudit } from './parameterApi';

const BASE = '/api/v1/governance/parameters';

export const governanceApi = {
  /** GET /v1/governance/parameters */
  list: () =>
    apiGet<SystemParameter[]>(BASE),

  /** PATCH /v1/governance/parameters/{id}?newValue=...&reason=... */
  update: (id: number, newValue: string, reason?: string) =>
    apiPatchParams<SystemParameter>(`${BASE}/${id}`, { newValue, ...(reason ? { reason } : {}) }),

  /** POST /v1/governance/parameters/{id}/approve */
  approve: (id: number) =>
    apiPost<SystemParameter>(`${BASE}/${id}/approve`),

  /** GET /v1/governance/parameters/key/{key} */
  getByKey: (key: string) =>
    apiGet<SystemParameter>(`${BASE}/key/${key}`),

  /** GET /v1/governance/parameters/category/{category} */
  getByCategory: (category: string) =>
    apiGet<SystemParameter[]>(`${BASE}/category/${category}`),

  /** GET /v1/governance/parameters/{id}/audit */
  getAudit: (id: number) =>
    apiGet<ParameterAudit[]>(`${BASE}/${id}/audit`),
};
