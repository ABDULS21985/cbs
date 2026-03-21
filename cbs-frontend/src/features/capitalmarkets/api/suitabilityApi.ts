import { apiGet, apiPost, apiPostParams, apiPut } from '@/lib/api';
import type { ClientRiskProfile, SuitabilityCheck } from '../types/suitability';

export const suitabilityApi = {
  // ─── Profiles ────────────────────────────────────────────────────────────────

  /** GET /v1/suitability/profiles */
  listProfiles: (params?: Record<string, unknown>) =>
    apiGet<ClientRiskProfile[]>('/api/v1/suitability/profiles', params),

  /** POST /v1/suitability/profiles */
  createProfile: (data: Partial<ClientRiskProfile>) =>
    apiPost<ClientRiskProfile>('/api/v1/suitability/profiles', data),

  /** PUT /v1/suitability/profiles/{code} */
  updateProfile: (code: string, data: Partial<ClientRiskProfile>) =>
    apiPut<ClientRiskProfile>(`/api/v1/suitability/profiles/${code}`, data),

  /** GET /v1/suitability/profiles/customer/{customerId} */
  getCustomerProfile: (customerId: number) =>
    apiGet<ClientRiskProfile>(`/api/v1/suitability/profiles/customer/${customerId}`),

  /** GET /v1/suitability/profiles/expired */
  getExpiredProfiles: () =>
    apiGet<ClientRiskProfile[]>('/api/v1/suitability/profiles/expired'),

  // ─── Checks ──────────────────────────────────────────────────────────────────

  /** GET /v1/suitability/checks */
  listChecks: (params?: Record<string, unknown>) =>
    apiGet<SuitabilityCheck[]>('/api/v1/suitability/checks', params),

  /** POST /v1/suitability/checks */
  performCheck: (data: Partial<SuitabilityCheck>) =>
    apiPost<SuitabilityCheck>('/api/v1/suitability/checks', data),

  /** POST /v1/suitability/checks/{ref}/override — requires @RequestParam justification & approver */
  overrideCheck: (ref: string, justification: string, approver: string) =>
    apiPostParams<SuitabilityCheck>(`/api/v1/suitability/checks/${ref}/override`, {
      justification,
      approver,
    }),

  /** POST /v1/suitability/checks/{ref}/acknowledge */
  acknowledgeCheck: (ref: string) =>
    apiPost<SuitabilityCheck>(`/api/v1/suitability/checks/${ref}/acknowledge`),

  /** GET /v1/suitability/checks/customer/{customerId} */
  getCustomerChecks: (customerId: number) =>
    apiGet<SuitabilityCheck[]>(`/api/v1/suitability/checks/customer/${customerId}`),
};
