import { apiGet, apiPost } from '@/lib/api';
import type { ClientRiskProfile, SuitabilityCheck } from '../types/suitability';

export const suitabilityApi = {
  /** GET /v1/suitability/profiles */
  listProfiles: (params?: Record<string, unknown>) =>
    apiGet<ClientRiskProfile[]>('/api/v1/suitability/profiles', params),

  /** GET /v1/suitability/checks */
  getExpired: (params?: Record<string, unknown>) =>
    apiGet<ClientRiskProfile[]>('/api/v1/suitability/checks', params),

  /** POST /v1/suitability/checks/{ref}/override */
  performCheck: (ref: string, data: Partial<SuitabilityCheck>) =>
    apiPost<SuitabilityCheck>(`/api/v1/suitability/checks/${ref}/override`, data),

  /** GET /v1/suitability/checks/customer/{customerId} */
  acknowledge: (customerId: number) =>
    apiGet<SuitabilityCheck>(`/api/v1/suitability/checks/customer/${customerId}`),

};
