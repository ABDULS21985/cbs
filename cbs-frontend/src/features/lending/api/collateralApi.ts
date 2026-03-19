import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { Collateral, ValuationHistoryItem, CollateralFilters } from '../types/collateral';

export const collateralApi = {
  list: (filters?: CollateralFilters) =>
    apiGet<Collateral[]>('/api/v1/collateral', filters as Record<string, unknown>),

  getById: (id: number) =>
    apiGet<Collateral>(`/api/v1/collateral/${id}`),

  getValuationHistory: (id: number) =>
    apiGet<ValuationHistoryItem[]>(`/api/v1/collateral/${id}/valuation-history`),

  registerCollateral: (data: Partial<Collateral>) =>
    apiPost<Collateral>('/api/v1/collateral', data),

  requestValuation: (id: number, data: Record<string, unknown>) =>
    apiPost<void>(`/api/v1/collateral/${id}/request-valuation`, data),

  updateInsurance: (id: number, data: Record<string, unknown>) =>
    apiPatch<Collateral>(`/api/v1/collateral/${id}/insurance`, data),

  markPerfected: (id: number) =>
    apiPost<Collateral>(`/api/v1/collateral/${id}/perfect`, {}),

  release: (id: number) =>
    apiPost<Collateral>(`/api/v1/collateral/${id}/release`, {}),
};
