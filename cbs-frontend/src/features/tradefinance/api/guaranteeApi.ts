import { apiGet, apiPost } from '@/lib/api';
import type { BankGuarantee } from '../types/guarantee';

export const guaranteesApi = {
  /** GET /guarantees/{id} */
  getGuarantee: (id: number) =>
    apiGet<BankGuarantee>(`/api/guarantees/${id}`),

  /** GET /guarantees/customer/{customerId} */
  getCustomerGuarantees: (customerId: number) =>
    apiGet<BankGuarantee[]>(`/api/guarantees/customer/${customerId}`),

  /** POST /guarantees/{id}/claim */
  claimGuarantee: (id: number) =>
    apiPost<BankGuarantee>(`/api/guarantees/${id}/claim`),

  /** POST /guarantees/batch/expire */
  processGuaranteeExpiry: () =>
    apiPost<Record<string, unknown>>('/api/guarantees/batch/expire'),

};
