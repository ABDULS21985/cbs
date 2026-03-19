import { apiGet, apiPut } from '@/lib/api';
import type { CorporateLeasePortfolio } from '../types/corporateLease';

export const corporateLeasesApi = {
  /** PUT /v1/corporate-leases/{id} */
  update: (id: number, data: Partial<CorporateLeasePortfolio>) =>
    apiPut<CorporateLeasePortfolio>(`/api/v1/corporate-leases/${id}`, data),

  /** GET /v1/corporate-leases/customer/{customerId} */
  summary: (customerId: number) =>
    apiGet<CorporateLeasePortfolio>(`/api/v1/corporate-leases/customer/${customerId}`),

  /** GET /v1/corporate-leases/customer/{customerId}/maturity */
  maturity: (customerId: number) =>
    apiGet<CorporateLeasePortfolio[]>(`/api/v1/corporate-leases/customer/${customerId}/maturity`),

};
