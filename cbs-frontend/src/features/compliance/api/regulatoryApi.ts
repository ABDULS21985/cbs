import { apiGet, apiPost } from '@/lib/api';

export interface ReturnStats {
  dueThisMonth: number;
  pendingSubmission: number;
  overdue: number;
  submittedMtd: number;
}

export interface RegulatoryReturn {
  id: number;
  returnCode: string;
  name: string;
  regulatoryBody: 'CBN' | 'NDIC' | 'SEC' | 'FRC' | 'NFIU';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  dueDate: string;
  period: string;
  status: 'SCHEDULED' | 'DATA_EXTRACTION' | 'VALIDATION' | 'REVIEW' | 'APPROVED' | 'SUBMITTED' | 'ACKNOWLEDGED';
  validationsPassed?: number;
  validationsTotal?: number;
  validationsFailed?: number;
  submittedAt?: string;
  submittedBy?: string;
  confirmationRef?: string;
}

export interface CalendarDay {
  date: string;
  returns: { id: number; name: string; regulatoryBody: string; status: RegulatoryReturn['status'] }[];
}

export interface ValidationRule {
  ruleNumber: number;
  description: string;
  expectedValue?: string;
  actualValue?: string;
  difference?: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  passed: boolean;
}

export const regulatoryApi = {
  getStats: () => apiGet<ReturnStats>('/api/v1/compliance/returns/stats'),
  getCalendar: (month: string) => apiGet<CalendarDay[]>('/api/v1/compliance/returns/calendar', { month }),
  getAll: (filters?: Record<string, unknown>) => apiGet<RegulatoryReturn[]>('/api/v1/compliance/returns', filters),
  getById: (id: number) => apiGet<RegulatoryReturn>(`/api/v1/compliance/returns/${id}`),
  extractData: (id: number) => apiPost<RegulatoryReturn>(`/api/v1/compliance/returns/${id}/extract`, {}),
  validate: (id: number) => apiPost<ValidationRule[]>(`/api/v1/compliance/returns/${id}/validate`, {}),
  submitForReview: (id: number) => apiPost<RegulatoryReturn>(`/api/v1/compliance/returns/${id}/submit-review`, {}),
  approve: (id: number) => apiPost<RegulatoryReturn>(`/api/v1/compliance/returns/${id}/approve`, {}),
  submitToRegulator: (id: number) => apiPost<RegulatoryReturn>(`/api/v1/compliance/returns/${id}/submit`, {}),
  getValidationResults: (id: number) => apiGet<ValidationRule[]>(`/api/v1/compliance/returns/${id}/validations`),
};
