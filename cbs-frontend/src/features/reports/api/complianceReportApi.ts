import { apiGet, apiPost, apiPostParams } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceReport {
  id: number;
  reportCode: string;
  reportType: string;
  reportName: string;
  regulator: string;
  reportingPeriod: string;
  dueDate: string;
  status: string;
  submissionReference?: string;
  submittedAt?: string;
  submittedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComplianceStats {
  total: number;
  overdue: number;
  draft: number;
  submitted: number;
}

export interface CreateComplianceReportPayload {
  reportCode: string;
  reportType: string;
  reportName: string;
  regulator: string;
  reportingPeriod: string;
  dueDate: string;
  notes?: string;
}

// ─── Exported API ─────────────────────────────────────────────────────────────

export const complianceReportApi = {
  create: (data: CreateComplianceReportPayload): Promise<ComplianceReport> =>
    apiPost<ComplianceReport>('/api/v1/compliance-reports', data),

  review: (code: string): Promise<ComplianceReport> =>
    apiPost<ComplianceReport>(`/api/v1/compliance-reports/${code}/review`, {}),

  submit: (code: string, submissionReference: string): Promise<ComplianceReport> =>
    apiPostParams<ComplianceReport>(`/api/v1/compliance-reports/${code}/submit`, { submissionReference }),

  getByRegulator: (regulator: string): Promise<ComplianceReport[]> =>
    apiGet<ComplianceReport[]>(`/api/v1/compliance-reports/regulator/${regulator}`),

  getOverdue: (): Promise<ComplianceReport[]> =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports/overdue'),

  getAll: (params?: { page?: number; size?: number }): Promise<ComplianceReport[]> =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports', params as Record<string, unknown>),

  getReturns: (params?: { page?: number; size?: number }): Promise<ComplianceReport[]> =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports/returns', params as Record<string, unknown>),

  getStats: (): Promise<ComplianceStats> =>
    apiGet<ComplianceStats>('/api/v1/compliance-reports/stats'),

  getAssessments: (params?: { page?: number; size?: number }): Promise<ComplianceReport[]> =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports/assessments', params as Record<string, unknown>),
};
