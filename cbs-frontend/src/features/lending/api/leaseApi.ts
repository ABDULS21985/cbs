import { apiGet } from '@/lib/api';
import type { LeaseContract, AmortizationRow } from '../types/lease';

export const leaseApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<LeaseContract[]>('/v1/leases', params),

  getById: (id: number) => apiGet<LeaseContract>(`/v1/leases/${id}`),

  getAmortizationSchedule: (id: number) =>
    apiGet<AmortizationRow[]>(`/v1/leases/${id}/amortization`),
};
