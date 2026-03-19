import { apiGet, apiPost } from '@/lib/api';
import type { PosLoan } from '../types/posLoan';

export const posLoansApi = {
  /** POST /v1/pos-loans/{number}/disburse */
  disburse: (number: string) =>
    apiPost<PosLoan>(`/api/v1/pos-loans/${number}/disburse`),

  /** POST /v1/pos-loans/{number}/return */
  processReturn: (number: string) =>
    apiPost<PosLoan>(`/api/v1/pos-loans/${number}/return`),

  /** GET /v1/pos-loans/customer/{customerId} */
  byCustomer: (customerId: number) =>
    apiGet<PosLoan[]>(`/api/v1/pos-loans/customer/${customerId}`),

  /** GET /v1/pos-loans/merchant/{merchantId} */
  byMerchant: (merchantId: number) =>
    apiGet<PosLoan[]>(`/api/v1/pos-loans/merchant/${merchantId}`),

};
