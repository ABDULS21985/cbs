import { apiGet, apiPost, apiPut, apiUpload } from '@/lib/api';

export type CaseNoteType = 'INTERNAL' | 'CUSTOMER' | 'ESCALATION' | 'RESOLUTION';

export interface CustomerCase {
  id: number;
  caseNumber: string;
  customerId: number;
  customerName: string;
  customerSegment?: string;
  caseType: 'COMPLAINT' | 'SERVICE_REQUEST' | 'INQUIRY' | 'DISPUTE' | 'FRAUD_REPORT';
  subCategory?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'PENDING_CUSTOMER' | 'PENDING_INTERNAL' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  subject: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedTeam?: string;
  escalatedTo?: string;
  rootCause?: string;
  resolution?: string;
  compensationAmount?: number;
  compensationApproved?: boolean;
  slaDeadline: string;
  slaBreached: boolean;
  relatedCaseIds?: number[];
  attachments?: CaseAttachment[];
  activities?: CaseActivity[];
  openedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseActivity {
  id: number;
  type: 'NOTE' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'ESCALATION' | 'ATTACHMENT' | 'RESOLUTION';
  noteType?: CaseNoteType;
  content: string;
  previousValue?: string;
  newValue?: string;
  createdBy: string;
  createdAt: string;
}

export interface CaseAttachment {
  id: number;
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

export interface CaseStats {
  openCases: number;
  slaBreached: number;
  resolvedToday: number;
  avgResolutionHours: number;
}

// Backend uses caseNumber (String) as path variable for all operations.
// The backend controller: @RequestMapping("/v1/cases") with context-path /api
// Operations use /{caseNumber}/assign, /{caseNumber}/resolve, etc.
export const caseApi = {
  getAll: (filters?: Record<string, unknown>) =>
    apiGet<CustomerCase[]>('/api/v1/cases', filters),
  getById: (caseNumber: string) =>
    apiGet<CustomerCase>(`/api/v1/cases/${caseNumber}`),
  create: (data: Partial<CustomerCase>) =>
    apiPost<CustomerCase>('/api/v1/cases', data),
  update: (caseNumber: string, data: Partial<CustomerCase>) =>
    apiPut<CustomerCase>(`/api/v1/cases/${caseNumber}`, data),
  assign: (caseNumber: string, assignedTo: string, team?: string) =>
    apiPost<CustomerCase>(`/api/v1/cases/${caseNumber}/assign`, { assignedTo, ...(team ? { team } : {}) }),
  escalate: (caseNumber: string, escalatedTo: string, reason: string) =>
    apiPost<CustomerCase>(`/api/v1/cases/${caseNumber}/escalate?escalateTo=${encodeURIComponent(escalatedTo)}&reason=${encodeURIComponent(reason)}`),
  resolve: (caseNumber: string, resolutionType: string, summary: string) =>
    apiPost<CustomerCase>(`/api/v1/cases/${caseNumber}/resolve?resolutionType=${encodeURIComponent(resolutionType)}&summary=${encodeURIComponent(summary)}`),
  close: (caseNumber: string, reason?: string) =>
    apiPost<CustomerCase>(`/api/v1/cases/${caseNumber}/close${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`),
  addNote: (caseNumber: string, content: string, noteType: CaseNoteType = 'INTERNAL') =>
    apiPost<CaseActivity>(`/api/v1/cases/${caseNumber}/notes`, { content, noteType }),
  addAttachment: (caseNumber: string, file: File) =>
    apiUpload<CaseAttachment>(`/api/v1/cases/${caseNumber}/attachments`, file),
  getStats: () =>
    apiGet<CaseStats>('/api/v1/cases/stats'),
  getMyCases: () =>
    apiGet<CustomerCase[]>('/api/v1/cases/my'),
  getUnassigned: () =>
    apiGet<CustomerCase[]>('/api/v1/cases/unassigned'),
  getByCustomer: (customerId: number) =>
    apiGet<CustomerCase[]>(`/api/v1/cases/customer/${customerId}`),
  getSlaBreached: () =>
    apiGet<CustomerCase[]>('/api/v1/cases/sla-breached'),
};
