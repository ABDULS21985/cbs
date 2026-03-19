import { apiGet, apiPost } from '@/lib/api';
import type {
  CreditFacility,
  SubLimit,
  Drawdown,
  UtilizationPoint,
  Covenant,
  DrawdownRequest,
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

  getUtilizationHistory: (id: number) =>
    apiGet<UtilizationPoint[]>(`/api/v1/credit-facilities/${id}/utilization-history`),

  getCovenants: (id: number) =>
    apiGet<Covenant[]>(`/api/v1/credit-facilities/${id}/covenants`),

  submitDrawdownRequest: (data: DrawdownRequest) =>
    apiPost<Drawdown>(`/api/v1/credit-facilities/${data.facilityId}/drawdowns`, data),
};
