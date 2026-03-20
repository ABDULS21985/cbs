import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type {
  CollectionStats,
  DpdAging,
  CollectionCase,
  DunningQueueItem,
  WriteOffRequest,
  RecoveryRecord,
} from '../types/collections';

export const collectionsApi = {
  createCase: (loanAccountId: number) =>
    apiPost<CollectionCase>(`/api/v1/collections/cases/loan/${loanAccountId}`),

  batchCreateCases: () =>
    apiPost<{ created: number }>('/api/v1/collections/cases/batch'),

  assignCase: (caseId: number, assignedTo: string, team?: string) =>
    apiPatch<CollectionCase>(`/api/v1/collections/cases/${caseId}/assign`, { assignedTo, team }),

  logAction: (caseId: number, action: Record<string, unknown>) =>
    apiPost<CollectionCase>(`/api/v1/collections/cases/${caseId}/actions`, action),

  closeCase: (caseId: number, resolutionType: string, resolutionAmount?: number) =>
    apiPost<CollectionCase>(`/api/v1/collections/cases/${caseId}/close`, { resolutionType, resolutionAmount }),

  getAgentCases: (assignedTo: string, params?: Record<string, unknown>) =>
    apiGet<CollectionCase[]>(`/api/v1/collections/cases/agent/${encodeURIComponent(assignedTo)}`, params),

  getStats: () => apiGet<CollectionStats>('/api/v1/collections/stats'),

  getDpdAging: () => apiGet<DpdAging[]>('/api/v1/collections/dpd-aging'),

  listCases: (params?: Record<string, unknown>) =>
    apiGet<CollectionCase[]>('/api/v1/collections/cases', params),

  getCase: (id: number) => apiGet<CollectionCase>(`/api/v1/collections/cases/${id}`),

  listDunningQueue: (params?: Record<string, unknown>) =>
    apiGet<DunningQueueItem[]>('/api/v1/collections/dunning-queue', params),

  logDunningOutcome: (id: number, outcome: string) =>
    apiPost<DunningQueueItem>(`/api/v1/collections/dunning-queue/${id}/outcome`, { outcome }),

  listWriteOffRequests: (params?: Record<string, unknown>) =>
    apiGet<WriteOffRequest[]>('/api/v1/collections/write-off-requests', params),

  submitWriteOffRequest: (data: {
    loanNumber: string;
    amount: number;
    type: 'PARTIAL' | 'FULL';
    recoveryEfforts: string;
    justification: string;
  }) => apiPost<WriteOffRequest>('/api/v1/collections/write-off-requests', data),

  listRecovery: (params?: Record<string, unknown>) =>
    apiGet<RecoveryRecord[]>('/api/v1/collections/recovery', params),

  recordRecovery: (data: {
    loanNumber: string;
    amount: number;
    date: string;
    agent: string;
    notes?: string;
  }) => apiPost<RecoveryRecord>('/api/v1/collections/recovery', data),
};
