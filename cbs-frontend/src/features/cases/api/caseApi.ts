import { apiGet, apiPost, apiPut, apiUpload } from '@/lib/api';

export interface CustomerCase {
  id: number;
  caseNumber: string;
  customerId: number;
  customerName: string;
  customerSegment?: string;
  caseType: 'COMPLAINT' | 'SERVICE_REQUEST' | 'ENQUIRY' | 'DISPUTE' | 'FRAUD';
  subCategory?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  subject: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
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

export const caseApi = {
  getAll: (filters?: Record<string, unknown>) =>
    apiGet<CustomerCase[]>('/api/v1/cases', filters),
  getById: (id: number) =>
    apiGet<CustomerCase>(`/api/v1/cases/${id}`),
  create: (data: Partial<CustomerCase>) =>
    apiPost<CustomerCase>('/api/v1/cases', data),
  update: (id: number, data: Partial<CustomerCase>) =>
    apiPut<CustomerCase>(`/api/v1/cases/${id}`, data),
  assign: (id: number, assignedTo: string) =>
    apiPost<CustomerCase>(`/api/v1/cases/${id}/assign`, { assignedTo }),
  escalate: (id: number, escalatedTo: string, reason: string) =>
    apiPost<CustomerCase>(`/api/v1/cases/${id}/escalate`, { escalatedTo, reason }),
  resolve: (id: number, resolution: string, rootCause?: string) =>
    apiPost<CustomerCase>(`/api/v1/cases/${id}/resolve`, { resolution, rootCause }),
  close: (id: number) =>
    apiPost<CustomerCase>(`/api/v1/cases/${id}/close`, {}),
  addNote: (id: number, content: string) =>
    apiPost<CaseActivity>(`/api/v1/cases/${id}/notes`, { content }),
  addAttachment: (id: number, file: File) =>
    apiUpload<CaseAttachment>(`/api/v1/cases/${id}/attachments`, file),
  getStats: () =>
    apiGet<CaseStats>('/api/v1/cases/stats'),
  getMyCases: () =>
    apiGet<CustomerCase[]>('/api/v1/cases/my'),
  getUnassigned: () =>
    apiGet<CustomerCase[]>('/api/v1/cases/unassigned'),
};
