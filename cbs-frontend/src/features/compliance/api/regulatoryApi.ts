import { apiGet, apiPost } from '@/lib/api';

export interface ReturnStats {
  totalReturns: number;
  submitted: number;
  draft: number;
  overdue: number;
  pending: number;
  byRegulator: Record<string, number>;
}

export interface RegulatoryReturn {
  id: number;
  reportCode: string;
  reportName: string;
  reportType: string;
  regulator: string;
  reportingPeriod: string;
  periodStartDate?: string;
  periodEndDate?: string;
  dueDate: string;
  submissionDate?: string;
  fileReference?: string;
  preparedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submissionReference?: string;
  regulatorAcknowledgement?: string;
  status: 'DRAFT' | 'REVIEWED' | 'SUBMITTED' | 'PENDING';
}

export interface ComplianceCalendarEntry {
  reportCode: string;
  reportName: string;
  regulator: string;
  reportingPeriod: string;
  periodStartDate: string;
  periodEndDate: string;
  dueDate: string;
  status: string;
  overdue: boolean;
}

export const regulatoryApi = {
  getStats: () =>
    apiGet<ReturnStats>('/api/v1/compliance/returns/stats'),

  getCalendar: () =>
    apiGet<ComplianceCalendarEntry[]>('/api/v1/compliance/returns/calendar'),

  getAll: (filters?: Record<string, unknown>) =>
    apiGet<RegulatoryReturn[]>('/api/v1/compliance/returns', filters),

  review: (code: string) =>
    apiPost<RegulatoryReturn>(`/api/v1/compliance-reports/${code}/review`),

  submit: (code: string, submissionReference: string) =>
    apiPost<RegulatoryReturn>(`/api/v1/compliance-reports/${code}/submit?submissionReference=${encodeURIComponent(submissionReference)}`),
};
