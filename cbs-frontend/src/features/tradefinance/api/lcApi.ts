import { apiGet, apiPost } from '@/lib/api';
import type { LetterOfCredit } from '../types/lc';

export const lcApi = {
  /** GET /v1/trade-finance/lc/{id} */
  getLC: (id: number) =>
    apiGet<LetterOfCredit>(`/api/v1/trade-finance/lc/${id}`),

  /** GET /v1/trade-finance/lc/customer/{customerId} */
  getCustomerLCs: (customerId: number) =>
    apiGet<LetterOfCredit[]>(`/api/v1/trade-finance/lc/customer/${customerId}`),

  /** POST /v1/trade-finance/lc/{id}/settle?amount=... */
  settleLC: (id: number, amount: number) =>
    apiPost<LetterOfCredit>(`/api/v1/trade-finance/lc/${id}/settle?amount=${amount}`),

  /** POST /v1/trade-finance/lc/batch/expire */
  expireLCs: () =>
    apiPost<Record<string, number>>('/api/v1/trade-finance/lc/batch/expire'),
};
