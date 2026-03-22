import api, { apiGet, apiPost } from '@/lib/api';
import type { PageMeta, TransactionDisputeSummary } from './transactionApi';

export interface DisputeRecord {
  id: number;
  disputeRef: string;
  transactionId: number;
  transactionRef: string;
  amount: number;
  currencyCode: string;
  reasonCode: string;
  description: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'REJECTED' | string;
  assignedTo?: string;
  filedAt: string;
  filedBy?: string;
  lastUpdatedAt: string;
  updatedBy?: string;
  closedAt?: string;
  closedBy?: string;
  responseNotes?: string;
  escalationNotes?: string;
  closingNotes?: string;
  supportingDocumentIds?: number[];
}

export interface DisputeDashboard {
  total: number;
  pendingResponse: number;
  underReview: number;
  resolved: number;
  escalated: number;
}

export interface RaiseDisputeRequest {
  reasonCode: string;
  description: string;
  contactEmail?: string;
  contactPhone?: string;
  files?: File[];
}

export interface DisputeListResponse {
  content: DisputeRecord[];
  totalElements?: number;
  page?: PageMeta;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const disputeApi = {
  raiseDispute: async (transactionId: number | string, payload: RaiseDisputeRequest): Promise<DisputeRecord> => {
    const formData = new FormData();
    formData.append('reasonCode', payload.reasonCode);
    formData.append('description', payload.description);
    if (payload.contactEmail) formData.append('contactEmail', payload.contactEmail);
    if (payload.contactPhone) formData.append('contactPhone', payload.contactPhone);
    payload.files?.forEach((file) => formData.append('files', file));

    const response = await api.post(`/api/v1/transactions/${transactionId}/dispute`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data as DisputeRecord;
  },

  listDisputes: async (params?: { status?: string; page?: number; size?: number }): Promise<DisputeListResponse> => {
    const response = await api.get('/api/v1/transactions/disputes', { params });
    return {
      content: response.data.data as DisputeRecord[],
      totalElements: response.data.page?.totalElements as number | undefined,
      page: response.data.page as PageMeta | undefined,
    };
  },

  getDashboard: async (): Promise<DisputeDashboard> => apiGet<DisputeDashboard>('/api/v1/transactions/disputes/dashboard'),

  getDispute: async (id: number): Promise<DisputeRecord> => apiGet<DisputeRecord>(`/api/v1/transactions/disputes/${id}`),

  respond: async (id: number, response: string): Promise<DisputeRecord> =>
    apiPost<DisputeRecord>(`/api/v1/transactions/disputes/${id}/respond`, { response }),

  escalate: async (id: number, notes: string): Promise<DisputeRecord> =>
    apiPost<DisputeRecord>(`/api/v1/transactions/disputes/${id}/escalate`, { notes }),

  close: async (id: number, response: 'RESOLVED' | 'REJECTED', notes: string): Promise<DisputeRecord> =>
    apiPost<DisputeRecord>(`/api/v1/transactions/disputes/${id}/close`, { response, notes }),

  downloadSupportingDocument: async (documentId: number): Promise<void> => {
    const response = await api.get(`/api/v1/documents/${documentId}/download`, { responseType: 'blob' });
    const contentDisposition = String(response.headers['content-disposition'] ?? '');
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] ?? `document-${documentId}`;
    triggerBlobDownload(new Blob([response.data], { type: String(response.headers['content-type'] ?? 'application/octet-stream') }), filename);
  },
};

export function toDisputeSummary(record: DisputeRecord): TransactionDisputeSummary {
  return {
    id: record.id,
    disputeRef: record.disputeRef,
    reasonCode: record.reasonCode,
    status: record.status,
    filedAt: record.filedAt,
    lastUpdatedAt: record.lastUpdatedAt,
  };
}
