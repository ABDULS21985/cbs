import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';
import type {
  CreditFacility,
  SubLimit,
  Drawdown,
  UtilizationPoint,
  Covenant,
  CreateFacilityPayload,
} from '../types/facility';

export const facilityApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<CreditFacility[]>('/api/v1/credit-facilities', params),

  getById: (id: number) =>
    apiGet<CreditFacility>(`/api/v1/credit-facilities/${id}`),

  getSubLimits: (id: number) =>
    apiGet<SubLimit[]>(`/api/v1/credit-facilities/${id}/sub-limits`),

  getDrawdowns: (id: number) =>
    apiGet<Drawdown[]>(`/api/v1/credit-facilities/${id}/drawdowns`),

  getUtilizationHistory: (id: number, params?: Record<string, unknown>) =>
    apiGet<UtilizationPoint[]>(`/api/v1/credit-facilities/${id}/utilization-history`, params),

  getCovenants: (id: number) =>
    apiGet<Covenant[]>(`/api/v1/credit-facilities/${id}/covenants`),

  // Backend: POST /v1/facilities (OverdraftController) with @RequestBody CreateFacilityRequest
  createFacility: (data: CreateFacilityPayload) =>
    apiPost<CreditFacility>('/api/v1/facilities', data),

  // Backend: POST /{id}/drawdowns?amount=...&narration=... (@RequestParam on CreditFacilityController)
  submitDrawdown: (facilityId: number, amount: number, narration?: string) => {
    const params = new URLSearchParams({ amount: String(amount) });
    if (narration) params.set('narration', narration);
    return api.post<{ data: CreditFacility }>(
      `/api/v1/credit-facilities/${facilityId}/drawdowns?${params}`,
    ).then((r) => r.data.data);
  },

  // Backend: POST /{id}/repay?amount=...&narration=... (OverdraftController @RequestParam)
  repay: (facilityId: number, amount: number, narration?: string) => {
    const params = new URLSearchParams({ amount: String(amount) });
    if (narration) params.set('narration', narration);
    return api.post<{ data: CreditFacility }>(
      `/api/v1/facilities/${facilityId}/repay?${params}`,
    ).then((r) => r.data.data);
  },

  // Backend: POST /{id}/interest/post (OverdraftController)
  postInterest: (facilityId: number) =>
    apiPost<CreditFacility>(`/api/v1/facilities/${facilityId}/interest/post`),

  // Backend: GET /customer/{customerId} (OverdraftController)
  getCustomerFacilities: (customerId: number, params?: Record<string, unknown>) =>
    apiGet<CreditFacility[]>(`/api/v1/facilities/customer/${customerId}`, params),
};
