import { apiGet, apiPost } from '@/lib/api';

export type Regulator = 'CBN' | 'NFIU' | 'SEC' | 'NDIC' | 'FATF';

export type ReportStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED';

export interface ComplianceReport {
  id: number;
  code: string;
  title: string;
  regulator: Regulator;
  reportType: string;
  reportingPeriod: string;
  dueDate: string;
  status: ReportStatus;
  preparerId: string;
  preparedBy?: string;
  reviewerId?: string;
  reviewedBy?: string;
  reviewComments?: string;
  submissionDate?: string;
  submissionRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceReportPage {
  content: ComplianceReport[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateReportPayload {
  title: string;
  regulator: Regulator;
  reportType: string;
  reportingPeriod: string;
  dueDate: string;
  preparerId: string;
}

export interface SubmitForReviewPayload {
  reviewerId: string;
  comments?: string;
}

export interface SubmitToRegulatorPayload {
  submissionDate: string;
  submissionRef: string;
}

export const complianceReportApi = {
  getByRegulator: (regulator: Regulator, params?: { page?: number; size?: number }) =>
    apiGet<ComplianceReportPage>(`/api/v1/compliance-reports/regulator/${regulator}`, params as Record<string, unknown>),

  getOverdue: () =>
    apiGet<ComplianceReport[]>('/api/v1/compliance-reports/overdue').catch(() => [] as ComplianceReport[]),

  create: (payload: CreateReportPayload) =>
    apiPost<ComplianceReport>('/api/v1/compliance-reports', payload),

  submitForReview: (code: string, payload: SubmitForReviewPayload) =>
    apiPost<ComplianceReport>(`/api/v1/compliance-reports/${code}/review`, payload),

  submitToRegulator: (code: string, payload: SubmitToRegulatorPayload) =>
    apiPost<ComplianceReport>(`/api/v1/compliance-reports/${code}/submit`, payload),
};
