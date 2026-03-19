import { apiGet } from '@/lib/api';
import type { LeaseContract, AmortizationRow } from '../types/lease';

export const leaseApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<LeaseContract[]>('/api/v1/leases', params),

  getById: (id: number) => apiGet<LeaseContract>(`/api/v1/leases/${id}`),

  getAmortizationSchedule: (id: number) =>
    apiGet<AmortizationRow[]>(`/api/v1/leases/${id}/amortization`),
};
