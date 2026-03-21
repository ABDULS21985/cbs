import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type {
  CorrespondentBank,
  NostroPosition,
  NostroReconItem,
  CreatePositionRequest,
  CreateReconItemRequest,
} from '../types/nostro';

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
  createPosition: (data: CreatePositionRequest) =>
    apiPost<NostroPosition>('/api/v1/nostro/positions', data),

  /** PATCH /v1/nostro/positions/{id}/statement?statementBalance=X&statementDate=Y */
  updateStatementBalance: (
    positionId: number,
    statementBalance: number,
    statementDate: string,
  ) =>
    apiPatch<NostroPosition>(
      `/api/v1/nostro/positions/${positionId}/statement?statementBalance=${statementBalance}&statementDate=${statementDate}`,
    ),

  // ─── Recon Items ────────────────────────────────────────────────────────────
  getReconItems: (positionId: number, params?: { page?: number; size?: number }) =>
    apiGet<NostroReconItem[]>(`/api/v1/nostro/positions/${positionId}/recon-items`, params),
  getUnmatchedItems: (positionId: number) =>
    apiGet<NostroReconItem[]>(`/api/v1/nostro/positions/${positionId}/recon-items/unmatched`),
  addReconItem: (positionId: number, data: CreateReconItemRequest) =>
    apiPost<NostroReconItem>(`/api/v1/nostro/positions/${positionId}/recon-items`, data),

  /** POST /v1/nostro/recon-items/{itemId}/match?matchReference=X&resolvedBy=Y */
  matchItem: (itemId: number, matchReference: string, resolvedBy: string) =>
    apiPost<NostroReconItem>(
      `/api/v1/nostro/recon-items/${itemId}/match?matchReference=${encodeURIComponent(matchReference)}&resolvedBy=${encodeURIComponent(resolvedBy)}`,
    ),
};
