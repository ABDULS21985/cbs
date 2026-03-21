import { apiGet, apiPost, apiDelete } from '@/lib/api';
import api from '@/lib/api';
import type { Collateral, ValuationHistoryItem, CollateralFilters } from '../types/collateral';

export const collateralApi = {
  list: (filters?: CollateralFilters) =>
    apiGet<Collateral[]>('/api/v1/collaterals', filters as Record<string, unknown>),

  getById: (id: number) =>
    apiGet<Collateral>(`/api/v1/collaterals/${id}`),

  getCustomerCollateral: (customerId: number, params?: Record<string, unknown>) =>
    apiGet<Collateral[]>(`/api/v1/collaterals/customer/${customerId}`, params),

  // Backend: GET /{id}/valuations (NOT /valuation-history)
  getValuationHistory: (id: number) =>
    apiGet<ValuationHistoryItem[]>(`/api/v1/collaterals/${id}/valuations`),

  // Backend: POST / with @RequestBody CollateralDto
  registerCollateral: (data: Partial<Collateral>) =>
    apiPost<Collateral>('/api/v1/collaterals', data),

  // Backend: POST /{id}/valuations with @RequestBody CollateralValuationDto (NOT /request-valuation)
  addValuation: (id: number, data: Record<string, unknown>) =>
    apiPost<ValuationHistoryItem>(`/api/v1/collaterals/${id}/valuations`, data),

  // Backend: POST /{collateralId}/link/{loanAccountId}?allocatedValue=... (@RequestParam)
  linkToLoan: (collateralId: number, loanAccountId: number, allocatedValue: number) => {
    const params = new URLSearchParams({ allocatedValue: String(allocatedValue) });
    return api.post(`/api/v1/collaterals/${collateralId}/link/${loanAccountId}?${params}`)
      .then(() => undefined);
  },

  // Backend: DELETE /{collateralId}/lien/{loanAccountId}
  unlinkFromLoan: (collateralId: number, loanAccountId: number) =>
    apiDelete<void>(`/api/v1/collaterals/${collateralId}/lien/${loanAccountId}`),

  // Backend: POST /loans/{loanId}/restructure with @RequestBody LoanRestructureRequest
  restructureLoan: (loanId: number, data: Record<string, unknown>) =>
    apiPost<void>(`/api/v1/collaterals/loans/${loanId}/restructure`, data),

  // Backend: GET /loans/{loanId}/restructure-history
  getRestructureHistory: (loanId: number) =>
    apiGet<unknown[]>(`/api/v1/collaterals/loans/${loanId}/restructure-history`),
};
