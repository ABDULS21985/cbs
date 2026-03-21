import { apiGet, apiPost } from '@/lib/api';

export type Regulator = 'CBN' | 'NFIU' | 'SEC' | 'NDIC' | 'FATF';

export type ReportStatus = 'DRAFT' | 'REVIEWED' | 'SUBMITTED' | 'PENDING';

export interface ComplianceReport {
  id: number;
  reportCode: string;
  reportName: string;
  reportType: string;
  regulator: Regulator;
  reportingPeriod: string;
  periodStartDate: string;
  periodEndDate: string;
  dueDate: string;
  submissionDate?: string;
  fileReference?: string;
  preparedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submissionReference?: string;
  regulatorAcknowledgement?: string;
  status: ReportStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReportPayload {
  reportName: string;
  regulator: Regulator;
  reportType: string;
  reportingPeriod: string;
  periodStartDate: string;
  periodEndDate: string;
  dueDate: string;
  preparedBy: string;
}

export const complianceReportApi = {
  getAll: (params?: { page?: number; size?: number }) =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports', params as Record<string, unknown>),

  getByRegulator: (regulator: Regulator) =>
    apiGet<ComplianceReport[]>(`/api/v1/compliance-reports/regulator/${regulator}`),

  getOverdue: () =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports/overdue'),

  getReturns: (params?: { page?: number; size?: number }) =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports/returns', params as Record<string, unknown>),

  getStats: () =>
    apiGet<{ total: number; overdue: number; draft: number; submitted: number }>('/api/v1/compliance-reports/stats'),

  create: (payload: CreateReportPayload) =>
    apiPost<ComplianceReport>('/api/v1/compliance-reports', payload),

  submitForReview: (code: string) =>
    apiPost<ComplianceReport>(`/api/v1/compliance-reports/${code}/review`),

  submitToRegulator: (code: string, submissionReference: string) =>
    apiPost<ComplianceReport>(`/api/v1/compliance-reports/${code}/submit?submissionReference=${encodeURIComponent(submissionReference)}`),
};
