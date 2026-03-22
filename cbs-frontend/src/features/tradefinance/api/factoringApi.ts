import { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { FactoringFacility, FactoringTransaction } from '../types/factoring';

export const factoringApi = {
  /** GET /v1/factoring/facility */
  listFacilities: (params?: Record<string, unknown>) =>
    apiGet<FactoringFacility[]>('/api/v1/factoring/facility', params),

  /** GET /v1/factoring/invoice */
  listInvoices: (params?: Record<string, unknown>) =>
    apiGet<FactoringTransaction[]>('/api/v1/factoring/invoice', params),

  /** POST /v1/factoring/invoice/{id}/recourse */
  recourse: (id: number, amount: number) =>
    apiPostParams<FactoringTransaction>(`/api/v1/factoring/invoice/${id}/recourse`, { amount }),

  /** GET /v1/factoring/facility/{code}/concentration */
  concentration: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/factoring/facility/${code}/concentration`),

};
