import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { SanctionsMatch, SanctionsStats, Watchlist, BatchScreeningResult, MatchStatus } from '../types/sanctions';

export const sanctionsApi = {
  getStats: () =>
    api.get<ApiResponse<SanctionsStats>>('/api/v1/sanctions/stats'),

  listMatches: (params?: { status?: MatchStatus; page?: number; size?: number }) =>
    api.get<ApiResponse<{ items: SanctionsMatch[]; page: object }>>('/api/v1/sanctions/matches', { params }),

  getMatch: (id: number) =>
    api.get<ApiResponse<SanctionsMatch>>(`/v1/sanctions/matches/${id}`),

  confirmHit: (id: number) =>
    api.post(`/v1/sanctions/matches/${id}/confirm`),

  markFalsePositive: (id: number, justification: string, documentId?: number) =>
    api.post(`/v1/sanctions/matches/${id}/false-positive`, { justification, documentId }),

  listWatchlists: () =>
    api.get<ApiResponse<Watchlist[]>>('/api/v1/sanctions/watchlists'),

  forceUpdateWatchlist: (id: number) =>
    api.post(`/v1/sanctions/watchlists/${id}/update`),

  runBatchScreen: () =>
    api.post<ApiResponse<BatchScreeningResult>>('/api/v1/sanctions/batch-screen'),

  getBatchStatus: (jobId: string) =>
    api.get<ApiResponse<BatchScreeningResult>>(`/v1/sanctions/batch-screen/${jobId}`),
};
