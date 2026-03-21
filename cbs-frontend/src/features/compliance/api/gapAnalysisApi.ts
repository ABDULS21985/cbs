import { apiGet, apiPost } from '@/lib/api';
import type { ComplianceGapAnalysis } from '../types/gapAnalysis';

export const gapAnalysisApi = {
  /** GET /v1/gap-analysis */
  list: (params?: Record<string, unknown>) =>
    apiGet<ComplianceGapAnalysis[]>('/api/v1/gap-analysis', params),

  /** POST /v1/gap-analysis */
  identify: (data: Partial<ComplianceGapAnalysis>) =>
    apiPost<ComplianceGapAnalysis>('/api/v1/gap-analysis', data),

  /** POST /v1/gap-analysis/{code}/plan?owner=...&description=...&targetDate=... */
  plan: (code: string, payload: { owner: string; description: string; targetDate: string }) =>
    apiPost<ComplianceGapAnalysis>(
      `/api/v1/gap-analysis/${code}/plan?owner=${encodeURIComponent(payload.owner)}&description=${encodeURIComponent(payload.description)}&targetDate=${encodeURIComponent(payload.targetDate)}`
    ),

  /** POST /v1/gap-analysis/{code}/progress */
  progress: (code: string) =>
    apiPost<ComplianceGapAnalysis>(`/api/v1/gap-analysis/${code}/progress`),

  /** POST /v1/gap-analysis/{code}/close */
  close: (code: string) =>
    apiPost<ComplianceGapAnalysis>(`/api/v1/gap-analysis/${code}/close`),

  /** POST /v1/gap-analysis/{code}/verify?verifiedBy=... */
  verify: (code: string, verifiedBy: string) =>
    apiPost<ComplianceGapAnalysis>(`/api/v1/gap-analysis/${code}/verify?verifiedBy=${encodeURIComponent(verifiedBy)}`),

  /** POST /v1/gap-analysis/{code}/accept-risk */
  acceptRisk: (code: string) =>
    apiPost<ComplianceGapAnalysis>(`/api/v1/gap-analysis/${code}/accept-risk`),

  /** GET /v1/gap-analysis/dashboard */
  dashboard: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/gap-analysis/dashboard', params),

  /** GET /v1/gap-analysis/overdue */
  overdue: (params?: Record<string, unknown>) =>
    apiGet<ComplianceGapAnalysis[]>('/api/v1/gap-analysis/overdue', params),
};
