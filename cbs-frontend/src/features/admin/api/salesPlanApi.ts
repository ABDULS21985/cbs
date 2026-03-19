import { apiGet, apiPost } from '@/lib/api';
import type { SalesPlan, SalesTarget } from '../types/salesPlan';

export const salesPlansApi = {
  /** POST /v1/sales-plans/{code}/targets */
  create: (code: string, data: Partial<SalesPlan>) =>
    apiPost<SalesPlan>(`/api/v1/sales-plans/${code}/targets`, data),

  /** POST /v1/sales-plans/targets/{code}/record */
  recordActual: (code: string) =>
    apiPost<SalesTarget>(`/api/v1/sales-plans/targets/${code}/record`),

  /** GET /v1/sales-plans/region/{region} */
  recordActual2: (region: string) =>
    apiGet<SalesTarget>(`/api/v1/sales-plans/region/${region}`),

  /** GET /v1/sales-plans/officer/{id}/targets */
  getTargetsByOfficer: (id: number) =>
    apiGet<SalesTarget[]>(`/api/v1/sales-plans/officer/${id}/targets`),

};
