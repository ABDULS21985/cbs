import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { Collateral, ValuationHistoryItem, CollateralFilters } from '../types/collateral';

export const collateralApi = {
  list: (filters?: CollateralFilters) =>
    apiGet<Collateral[]>('/api/v1/collaterals', filters as Record<string, unknown>),

  getById: (id: number) =>
    apiGet<Collateral>(`/api/v1/collaterals/${id}`),

  getValuationHistory: (id: number) =>
    apiGet<ValuationHistoryItem[]>(`/api/v1/collaterals/${id}/valuation-history`),

  registerCollateral: (data: Partial<Collateral>) =>
    apiPost<Collateral>('/api/v1/collaterals', data),

  requestValuation: (id: number, data: Record<string, unknown>) =>
    apiPost<void>(`/api/v1/collaterals/${id}/request-valuation`, data),

  updateInsurance: (id: number, data: Record<string, unknown>) =>
    apiPatch<Collateral>(`/api/v1/collaterals/${id}/insurance`, data),

  markPerfected: (id: number) =>
    apiPost<Collateral>(`/api/v1/collaterals/${id}/perfect`, {}),

  release: (id: number) =>
    apiPost<Collateral>(`/api/v1/collaterals/${id}/release`, {}),
};
