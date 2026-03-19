import { apiGet, apiPost } from '@/lib/api';
import type { ProviderHealthLog, ProviderTransactionLog, ServiceProvider } from '../types/providerExt';

export const providersApi = {
  /** POST /v1/providers/{code}/activate */
  activate: (code: string) =>
    apiPost<ServiceProvider>(`/api/v1/providers/${code}/activate`),

  /** POST /v1/providers/{code}/health-check */
  healthCheck: (code: string) =>
    apiPost<ProviderHealthLog>(`/api/v1/providers/${code}/health-check`),

  /** POST /v1/providers/{code}/transaction */
  logTransaction: (code: string, data: Partial<ProviderTransactionLog>) =>
    apiPost<ProviderTransactionLog>(`/api/v1/providers/${code}/transaction`, data),

  /** POST /v1/providers/{code}/failover */
  failover: (code: string) =>
    apiPost<ServiceProvider>(`/api/v1/providers/${code}/failover`),

  /** GET /v1/providers/{code}/dashboard */
  dashboard: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/providers/${code}/dashboard`),

  /** GET /v1/providers/cost-report */
  costReport: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/providers/cost-report', params),

  /** GET /v1/providers/sla-compliance */
  slaCompliance: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/providers/sla-compliance', params),

};
