import { apiGet, apiPost } from '@/lib/api';
import type { ReceivableInvoice } from '../types/receivable';

export const receivablesApi = {
  /** POST /v1/receivables/{invoiceNumber}/pay */
  pay: (invoiceNumber: string) =>
    apiPost<ReceivableInvoice>(`/api/v1/receivables/${invoiceNumber}/pay`),

  /** GET /v1/receivables/overdue */
  getOverdue: (params?: Record<string, unknown>) =>
    apiGet<ReceivableInvoice[]>('/api/v1/receivables/overdue', params),

  /** POST /v1/receivables/mark-overdue */
  markOverdue: () =>
    apiPost<number>('/api/v1/receivables/mark-overdue'),

  /** GET /v1/receivables/customer/{id} */
  getByCustomer: (id: number) =>
    apiGet<ReceivableInvoice[]>(`/api/v1/receivables/customer/${id}`),

};
