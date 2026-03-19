import { apiGet, apiPost } from '@/lib/api';
import type { ScreeningRequest } from '../types/sanctionsExt';

export const sanctionsApi = {
  /** POST /v1/sanctions/screen */
  screen: () =>
    apiPost<ScreeningRequest>('/api/v1/sanctions/screen'),

  /** POST /v1/sanctions/matches/{screeningId}/dispose/{matchId} */
  dispose: (screeningId: number, matchId: number) =>
    apiPost<ScreeningRequest>(`/api/v1/sanctions/matches/${screeningId}/dispose/${matchId}`),

  /** GET /v1/sanctions/pending */
  getPending: (params?: Record<string, unknown>) =>
    apiGet<ScreeningRequest[]>('/api/v1/sanctions/pending', params),

};
