import { apiGet, apiPost } from '@/lib/api';
import type { CashflowForecast, CustomerBehaviourEvent, DashboardDefinition, DashboardWidget, DocumentProcessingJob } from '../types/intelligenceExt';

export const intelligenceApi = {
  /** GET /v1/intelligence/documents/process */
  listJobs: (params?: Record<string, unknown>) =>
    apiGet<DocumentProcessingJob[]>('/api/v1/intelligence/documents/process', params),

  /** POST /v1/intelligence/dashboards/{id}/widgets */
  addWidget: (id: number, data: Partial<DashboardWidget>) =>
    apiPost<DashboardWidget>(`/api/v1/intelligence/dashboards/${id}/widgets`, data),

  /** GET /v1/intelligence/dashboards/code/{code} */
  getWithWidgets: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/intelligence/dashboards/code/${code}`),

  /** GET /v1/intelligence/dashboards/type/{type} */
  getByType: (type: string) =>
    apiGet<DashboardDefinition[]>(`/api/v1/intelligence/dashboards/type/${type}`),

  /** GET /v1/intelligence/cashflow/forecast */
  listForecasts: (params?: Record<string, unknown>) =>
    apiGet<CashflowForecast[]>('/api/v1/intelligence/cashflow/forecast', params),

  /** POST /v1/intelligence/behaviour/events */
  track: (data: Partial<CustomerBehaviourEvent>) =>
    apiPost<CustomerBehaviourEvent>('/api/v1/intelligence/behaviour/events', data),

};
