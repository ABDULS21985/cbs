import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { SystemParameter, ParameterAudit } from './parameterApi';

export const governanceApi = {
  /** GET /v1/governance/parameters */
  list: () =>
    apiGet<SystemParameter[]>('/api/v1/governance/parameters'),

  /** PATCH /v1/governance/parameters/{id} */
  update: (id: number, data?: Partial<SystemParameter>) =>
    apiPatch<SystemParameter>(`/api/v1/governance/parameters/${id}`, data),

  /** POST /v1/governance/parameters/{id}/approve */
  approve: (id: number) =>
    apiPost<SystemParameter>(`/api/v1/governance/parameters/${id}/approve`),

  /** GET /v1/governance/parameters/key/{key} */
  getByKey: (key: string) =>
    apiGet<SystemParameter>(`/api/v1/governance/parameters/key/${key}`),

  /** GET /v1/governance/parameters/category/{category} */
  getByCategory: (category: string) =>
    apiGet<SystemParameter[]>(`/api/v1/governance/parameters/category/${category}`),

  /** GET /v1/governance/parameters/{id}/audit */
  getAudit: (id: number) =>
    apiGet<ParameterAudit[]>(`/api/v1/governance/parameters/${id}/audit`),
};
