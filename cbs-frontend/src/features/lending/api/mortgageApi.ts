import { apiGet } from '@/lib/api';
import type { MortgageLoan, LtvPoint } from '../types/mortgage';

export const mortgageApi = {
  list: (params?: Record<string, unknown>) =>
    apiGet<MortgageLoan[]>('/api/v1/mortgages', params),

  getById: (id: number) => apiGet<MortgageLoan>(`/v1/mortgages/${id}`),

  getLtvHistory: (id: number) => apiGet<LtvPoint[]>(`/v1/mortgages/${id}/ltv-history`),
};
