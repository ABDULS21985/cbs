import { apiGet, apiPost } from '@/lib/api';
import type { SalesLead } from '../types/salesLead';

export const salesLeadsApi = {
  /** POST /v1/sales-leads/{number}/advance */
  create: (number: string, data: Partial<SalesLead>) =>
    apiPost<SalesLead>(`/api/v1/sales-leads/${number}/advance`, data),

  /** POST /v1/sales-leads/{number}/assign */
  assign: (number: string) =>
    apiPost<SalesLead>(`/api/v1/sales-leads/${number}/assign`),

  /** GET /v1/sales-leads/assignee/{assignedTo} */
  assign2: (assignedTo: string) =>
    apiGet<SalesLead>(`/api/v1/sales-leads/assignee/${assignedTo}`),

  /** GET /v1/sales-leads/stage/{stage} */
  byStage: (stage: string) =>
    apiGet<SalesLead[]>(`/api/v1/sales-leads/stage/${stage}`),

};
