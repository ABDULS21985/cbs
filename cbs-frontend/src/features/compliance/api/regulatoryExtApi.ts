import { apiGet, apiPost } from '@/lib/api';
import type { RegulatoryReportDefinition, RegulatoryReportRun } from '../types/regulatoryExt';

export const regulatoryApi = {
  /** POST /v1/regulatory/definitions */
  createDefinition: (data: Partial<RegulatoryReportDefinition>) =>
    apiPost<RegulatoryReportDefinition>('/api/v1/regulatory/definitions', data),

  /** GET /v1/regulatory/definitions */
  getAll: (params?: Record<string, unknown>) =>
    apiGet<RegulatoryReportDefinition[]>('/api/v1/regulatory/definitions', params),

  /** GET /v1/regulatory/definitions/regulator/{regulator} */
  getByRegulator: (regulator: string) =>
    apiGet<RegulatoryReportDefinition[]>(`/api/v1/regulatory/definitions/regulator/${regulator}`),

  /** GET /v1/regulatory/runs/{reportCode} */
  getRuns: (reportCode: string) =>
    apiGet<RegulatoryReportRun[]>(`/api/v1/regulatory/runs/${reportCode}`),

  /** POST /v1/regulatory/generate */
  generate: (reportCode: string, data: { periodStart: string; periodEnd: string }) =>
    apiPost<RegulatoryReportRun>(`/api/v1/regulatory/generate?reportCode=${encodeURIComponent(reportCode)}&periodStart=${encodeURIComponent(data.periodStart)}&periodEnd=${encodeURIComponent(data.periodEnd)}`),

  /** POST /v1/regulatory/runs/{runId}/submit */
  submitRun: (runId: number) =>
    apiPost<RegulatoryReportRun>(`/api/v1/regulatory/runs/${runId}/submit`),
};
