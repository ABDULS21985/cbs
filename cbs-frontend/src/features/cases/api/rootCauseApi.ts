import { apiGet, apiPost } from '@/lib/api';
import type { CasePatternInsight, CaseRootCauseAnalysis } from '../types/rootCause';

export const rootCauseAnalysisApi = {
  /** POST /v1/root-cause-analysis/{code}/corrective-action */
  addCorrectiveAction: (code: string, data: Record<string, unknown>) =>
    apiPost<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/${code}/corrective-action`, data),

  /** POST /v1/root-cause-analysis/{code}/complete */
  complete: (code: string) =>
    apiPost<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/${code}/complete`),

  /** POST /v1/root-cause-analysis/{code}/validate */
  validate: (code: string) =>
    apiPost<CaseRootCauseAnalysis>(`/api/v1/root-cause-analysis/${code}/validate`),

  /** POST /v1/root-cause-analysis/patterns */
  generatePatterns: () =>
    apiPost<CasePatternInsight[]>('/api/v1/root-cause-analysis/patterns'),

  /** GET /v1/root-cause-analysis/recurring */
  recurring: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/root-cause-analysis/recurring', params),

  /** GET /v1/root-cause-analysis/dashboard */
  dashboard: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/root-cause-analysis/dashboard', params),

};
