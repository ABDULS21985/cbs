import { apiGet, apiPost } from '@/lib/api';
import type { LetterOfCredit } from '../types/lc';

export const lcApi = {
  /** GET /lc/{id} */
  getLC: (id: number) =>
    apiGet<LetterOfCredit>(`/api/lc/${id}`),

  /** GET /lc/customer/{customerId} */
  getCustomerLCs: (customerId: number) =>
    apiGet<LetterOfCredit[]>(`/api/lc/customer/${customerId}`),

  /** POST /lc/{id}/settle */
  settleLC: (id: number) =>
    apiPost<LetterOfCredit>(`/api/lc/${id}/settle`),

  /** POST /lc/batch/expire */
  expireLCs: () =>
    apiPost<Record<string, unknown>>('/api/lc/batch/expire'),

};
