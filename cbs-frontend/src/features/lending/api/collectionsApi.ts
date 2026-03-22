import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';
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

  // Backend: PATCH /cases/{caseId}/assign?assignedTo=...&team=... (@RequestParam)
  assignCase: (caseId: number, assignedTo: string, team?: string) => {
    const params = new URLSearchParams({ assignedTo });
    if (team) params.set('team', team);
    return api.patch<{ data: CollectionCase }>(
      `/api/v1/collections/cases/${caseId}/assign?${params}`,
    ).then((r) => r.data.data);
  },

  logAction: (caseId: number, action: Record<string, unknown>) =>
    apiPost<CollectionCase>(`/api/v1/collections/cases/${caseId}/actions`, action),

  // Backend: POST /cases/{caseId}/close?resolutionType=...&resolutionAmount=... (@RequestParam)
  closeCase: (caseId: number, resolutionType: string, resolutionAmount?: number) => {
    const params = new URLSearchParams({ resolutionType });
    if (resolutionAmount != null) params.set('resolutionAmount', String(resolutionAmount));
    return api.post<{ data: CollectionCase }>(
      `/api/v1/collections/cases/${caseId}/close?${params}`,
    ).then((r) => r.data.data);
  },

  getAgentCases: (assignedTo: string, params?: Record<string, unknown>) =>
    apiGet<CollectionCase[]>(`/api/v1/collections/cases/agent/${encodeURIComponent(assignedTo)}`, params),

  getStats: () => apiGet<CollectionStats>('/api/v1/collections/stats'),

  getDpdAging: () => apiGet<DpdAging[]>('/api/v1/collections/dpd-aging'),

  listCases: (params?: Record<string, unknown>) =>
    apiGet<CollectionCase[]>('/api/v1/collections/cases', params),

  getCase: (id: number) => apiGet<CollectionCase>(`/api/v1/collections/cases/${id}`),

  listDunningQueue: (params?: Record<string, unknown>) =>
    apiGet<DunningQueueItem[]>('/api/v1/collections/dunning-queue', params),

  listWriteOffRequests: (params?: Record<string, unknown>) =>
    apiGet<WriteOffRequest[]>('/api/v1/collections/write-off-requests', params),

  listRecovery: () =>
    apiGet<RecoveryRecord[]>('/api/v1/collections/recovery'),
};
