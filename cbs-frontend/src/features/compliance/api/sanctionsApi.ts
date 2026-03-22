import { apiGet, apiPost } from '@/lib/api';
import type {
  ScreeningRequest,
  ScreeningMatch,
  ScreeningStats,
  Watchlist,
  ScreenNamePayload,
  BatchScreenPayload,
} from '../types/sanctions';

export const sanctionsApi = {
  // ─── Screening ──────────────────────────────────────────────────────────────

  /** POST /v1/sanctions/screen */
  screenName: (data: ScreenNamePayload) =>
    apiPost<ScreeningRequest>('/api/v1/sanctions/screen', data),

  /** GET /v1/sanctions/screen */
  getScreeningStatus: () =>
    apiGet<{ status: string }>('/api/v1/sanctions/screen'),

  /** POST /v1/sanctions/matches/{screeningId}/dispose/{matchId} — returns updated ScreeningRequest */
  disposeMatch: (screeningId: number, matchId: number, data: { disposition: string; disposedBy: string; notes?: string }) =>
    apiPost<ScreeningRequest>(`/api/v1/sanctions/matches/${screeningId}/dispose/${matchId}`, data),

  /** GET /v1/sanctions/pending */
  getPendingReview: (params?: Record<string, unknown>) =>
    apiGet<ScreeningRequest[]>('/api/v1/sanctions/pending', params),

  // ─── Listings ───────────────────────────────────────────────────────────────

  /** GET /v1/sanctions */
  listScreenings: (params?: Record<string, unknown>) =>
    apiGet<ScreeningRequest[]>('/api/v1/sanctions', params),

  /** GET /v1/sanctions/stats */
  getStats: () =>
    apiGet<ScreeningStats>('/api/v1/sanctions/stats'),

  /** GET /v1/sanctions/matches */
  getScreeningsWithMatches: (params?: Record<string, unknown>) =>
    apiGet<ScreeningRequest[]>('/api/v1/sanctions/matches', params),

  /** GET /v1/sanctions/watchlists */
  getWatchlists: (params?: Record<string, unknown>) =>
    apiGet<Watchlist[]>('/api/v1/sanctions/watchlists', params),

  // ─── Match Actions ──────────────────────────────────────────────────────────

  /** GET /v1/sanctions/matches/{id} — returns ScreeningRequest (includes matches[]) */
  getMatchDetail: (id: number) =>
    apiGet<ScreeningRequest>(`/api/v1/sanctions/matches/${id}`),

  /** POST /v1/sanctions/matches/{id}/confirm — returns updated ScreeningRequest */
  confirmMatch: (id: number) =>
    apiPost<ScreeningRequest>(`/api/v1/sanctions/matches/${id}/confirm`),

  /** POST /v1/sanctions/matches/{id}/false-positive — returns updated ScreeningRequest */
  falsePositiveMatch: (id: number) =>
    apiPost<ScreeningRequest>(`/api/v1/sanctions/matches/${id}/false-positive`),

  // ─── Watchlist Maintenance ──────────────────────────────────────────────────

  /** POST /v1/sanctions/watchlists/{id}/update */
  updateWatchlist: (id: number) =>
    apiPost<Watchlist>(`/api/v1/sanctions/watchlists/${id}/update`),

  // ─── Batch Screening ────────────────────────────────────────────────────────

  /** GET /v1/sanctions/batch-screen */
  getBatchScreenJobs: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>[]>('/api/v1/sanctions/batch-screen', params),

  /** POST /v1/sanctions/batch-screen */
  batchScreen: (data: BatchScreenPayload) =>
    apiPost<Record<string, unknown>>('/api/v1/sanctions/batch-screen', data),

  /** GET /v1/sanctions/batch-screen/{jobId} */
  getBatchJobStatus: (jobId: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/sanctions/batch-screen/${jobId}`),
};
