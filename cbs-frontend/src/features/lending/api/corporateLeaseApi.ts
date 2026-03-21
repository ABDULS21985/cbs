import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { CorporateLeasePortfolio } from '../types/corporateLease';

export const corporateLeasesApi = {
  // Backend: GET /v1/corporate-leases
  list: () =>
    apiGet<CorporateLeasePortfolio[]>('/api/v1/corporate-leases'),

  // Backend: POST /v1/corporate-leases with @RequestBody CorporateLeasePortfolio
  create: (data: Partial<CorporateLeasePortfolio>) =>
    apiPost<CorporateLeasePortfolio>('/api/v1/corporate-leases', data),

  // Backend: PUT /v1/corporate-leases/{id}
  update: (id: number, data: Partial<CorporateLeasePortfolio>) =>
    apiPut<CorporateLeasePortfolio>(`/api/v1/corporate-leases/${id}`, data),

  // Backend: GET /v1/corporate-leases/customer/{customerId}
  summary: (customerId: number) =>
    apiGet<CorporateLeasePortfolio>(`/api/v1/corporate-leases/customer/${customerId}`),

  // Backend: GET /v1/corporate-leases/customer/{customerId}/maturity
  maturity: (customerId: number) =>
    apiGet<CorporateLeasePortfolio[]>(`/api/v1/corporate-leases/customer/${customerId}/maturity`),
};
