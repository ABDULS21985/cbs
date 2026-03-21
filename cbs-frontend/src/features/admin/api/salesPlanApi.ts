import { apiGet, apiPost } from '@/lib/api';
import type { SalesPlan, SalesTarget } from '../types/salesPlan';

export const salesPlansApi = {
  /** GET /v1/sales-plans — list all */
  getAll: () =>
    apiGet<SalesPlan[]>('/api/v1/sales-plans'),

  /** POST /v1/sales-plans — create new plan */
  createPlan: (data: Partial<SalesPlan>) =>
    apiPost<SalesPlan>('/api/v1/sales-plans', data),

  /** POST /v1/sales-plans/{code}/targets */
  create: (code: string, data: Partial<SalesPlan>) =>
    apiPost<SalesPlan>(`/api/v1/sales-plans/${code}/targets`, data),

  /** POST /v1/sales-plans/targets/{code}/record */
  recordActual: (code: string) =>
    apiPost<SalesTarget>(`/api/v1/sales-plans/targets/${code}/record`),

  /** GET /v1/sales-plans/region/{region} */
  getPlansByRegion: (region: string) =>
    apiGet<SalesPlan[]>(`/api/v1/sales-plans/region/${region}`),

  /** GET /v1/sales-plans/officer/{id}/targets */
  getTargetsByOfficer: (id: number) =>
    apiGet<SalesTarget[]>(`/api/v1/sales-plans/officer/${id}/targets`),

};
