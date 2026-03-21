import api, { apiGet, apiPost } from '@/lib/api';
import type { LeaseContract, AmortizationRow } from '../types/lease';

export const leaseApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<LeaseContract[]>('/api/v1/leases', params),

  getById: (id: number) => apiGet<LeaseContract>(`/api/v1/leases/${id}`),

  // Backend: POST / with @RequestBody LeaseContract
  create: (data: Record<string, unknown>) =>
    apiPost<LeaseContract>('/api/v1/leases', data),

  // Backend: POST /{number}/activate (@PathVariable String number)
  activate: (leaseNumber: string) =>
    api.post<{ data: LeaseContract }>(
      `/api/v1/leases/${leaseNumber}/activate`,
    ).then((r) => r.data.data),

  // Backend: POST /{number}/depreciate
  depreciate: (leaseNumber: string) =>
    api.post<{ data: LeaseContract }>(
      `/api/v1/leases/${leaseNumber}/depreciate`,
    ).then((r) => r.data.data),

  // Backend: POST /{number}/purchase-option
  exercisePurchaseOption: (leaseNumber: string) =>
    api.post<{ data: LeaseContract }>(
      `/api/v1/leases/${leaseNumber}/purchase-option`,
    ).then((r) => r.data.data),

  // Backend: POST /{number}/early-terminate
  earlyTerminate: (leaseNumber: string) =>
    api.post<{ data: LeaseContract }>(
      `/api/v1/leases/${leaseNumber}/early-terminate`,
    ).then((r) => r.data.data),

  // Backend: GET /customer/{customerId}
  getByCustomer: (customerId: number) =>
    apiGet<LeaseContract[]>(`/api/v1/leases/customer/${customerId}`),

  // Backend: GET /asset-category/{category}
  getByAssetCategory: (category: string) =>
    apiGet<LeaseContract[]>(`/api/v1/leases/asset-category/${category}`),

  getAmortizationSchedule: (id: number) =>
    apiGet<AmortizationRow[]>(`/api/v1/leases/${id}/amortization`),
};
