import { apiGet, apiPost } from '@/lib/api';
import type { CorrespondentBank, NostroPosition, NostroReconItem } from '../types/nostro';

export const nostroApi = {
  // ─── Correspondent Banks ────────────────────────────────────────────────────
  listBanks: () => apiGet<CorrespondentBank[]>('/api/v1/nostro/banks'),
  getBank: (id: number) => apiGet<CorrespondentBank>(`/api/v1/nostro/banks/${id}`),
  registerBank: (data: Partial<CorrespondentBank>) =>
    apiPost<CorrespondentBank>('/api/v1/nostro/banks', data),

  // ─── Positions ──────────────────────────────────────────────────────────────
  listPositions: (params?: Record<string, unknown>) =>
    apiGet<NostroPosition[]>('/api/v1/nostro/positions', params),
  getPosition: (id: number) =>
    apiGet<NostroPosition>(`/api/v1/nostro/positions/${id}`),
  getPositionsByType: (type: string) =>
    apiGet<NostroPosition[]>(`/api/v1/nostro/positions/type/${type}`),
  createPosition: (data: Record<string, unknown>) =>
    apiPost<NostroPosition>('/api/v1/nostro/positions', data),

  // ─── Recon Items ────────────────────────────────────────────────────────────
  getReconItems: (positionId: number) =>
    apiGet<NostroReconItem[]>(`/api/v1/nostro/positions/${positionId}/recon-items`),
  getUnmatchedItems: (positionId: number) =>
    apiGet<NostroReconItem[]>(`/api/v1/nostro/positions/${positionId}/recon-items/unmatched`),
  addReconItem: (positionId: number, data: Record<string, unknown>) =>
    apiPost<NostroReconItem>(`/api/v1/nostro/positions/${positionId}/recon-items`, data),
  matchItem: (itemId: number, data: Record<string, unknown>) =>
    apiPost<NostroReconItem>(`/api/v1/nostro/recon-items/${itemId}/match`, data),
};
