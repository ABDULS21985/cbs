import { apiGet, apiPost } from '@/lib/api';
import type {
  CasePatternInsight,
  CaseRootCauseAnalysis,
  CorrectiveActionPayload,
  RcaDashboardData,
  RecurringRootCause,
} from '../types/rootCause';

export const rootCauseAnalysisApi = {
  /** POST /v1/root-cause-analysis — create a new RCA for a case */
  create: (data: Partial<CaseRootCauseAnalysis>) =>
    apiPost<CaseRootCauseAnalysis>('/api/v1/root-cause-analysis', data),

  /** GET /v1/root-cause-analysis/{code} */
  getById: (code: string) =>
    apiGet<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/${code}`),

  /** GET /v1/root-cause-analysis/case/{caseId} */
  getByCaseId: (caseId: number) =>
    apiGet<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/case/${caseId}`),

  /** POST /v1/root-cause-analysis/{code}/corrective-action */
  addCorrectiveAction: (code: string, data: CorrectiveActionPayload) =>
    apiPost<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/${code}/corrective-action`, data),

  /** POST /v1/root-cause-analysis/{code}/complete */
  complete: (code: string) =>
    apiPost<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/${code}/complete`),

  /** POST /v1/root-cause-analysis/{code}/validate */
  validate: (code: string) =>
    apiPost<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/${code}/validate`),

  /** POST /v1/root-cause-analysis/patterns — generate pattern insights for a date range */
  generatePatterns: (params?: { from?: string; to?: string }) =>
    apiPost<CasePatternInsight[]>('/api/v1/root-cause-analysis/patterns', params ?? {}),

  /** GET /v1/root-cause-analysis/recurring */
  recurring: (params?: { from?: string; to?: string; limit?: number }) =>
    apiGet<RecurringRootCause[]>('/api/v1/root-cause-analysis/recurring', params as Record<string, unknown>),

  /** GET /v1/root-cause-analysis/dashboard */
  dashboard: (params?: Record<string, unknown>) =>
    apiGet<RcaDashboardData>('/api/v1/root-cause-analysis/dashboard', params),
};
