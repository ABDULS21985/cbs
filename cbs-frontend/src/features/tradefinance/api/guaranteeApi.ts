import { apiGet, apiPost } from '@/lib/api';
import type { BankGuarantee } from '../types/guarantee';

export const guaranteesApi = {
  /** GET /v1/trade-finance/guarantees/{id} */
  getGuarantee: (id: number) =>
    apiGet<BankGuarantee>(`/api/v1/trade-finance/guarantees/${id}`),

  /** GET /v1/trade-finance/guarantees/customer/{customerId} */
  getCustomerGuarantees: (customerId: number) =>
    apiGet<BankGuarantee[]>(`/api/v1/trade-finance/guarantees/customer/${customerId}`),

  /** POST /v1/trade-finance/guarantees/{id}/claim?amount=... */
  claimGuarantee: (id: number, amount: number) =>
    apiPost<BankGuarantee>(`/api/v1/trade-finance/guarantees/${id}/claim?amount=${amount}`),

  /** POST /v1/trade-finance/guarantees/batch/expire */
  processGuaranteeExpiry: () =>
    apiPost<Record<string, number>>('/api/v1/trade-finance/guarantees/batch/expire'),
};
