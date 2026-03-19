import { apiGet, apiPost } from '@/lib/api';
import type { ChannelSession } from '../types/channelExt';

export const channelsApi = {
  /** GET /v1/channels/sessions */
  listSessions: (params?: Record<string, unknown>) =>
    apiGet<ChannelSession[]>('/api/v1/channels/sessions', params),

  /** POST /v1/channels/sessions/{sessionId}/touch */
  touch: (sessionId: number) =>
    apiPost<void>(`/api/v1/channels/sessions/${sessionId}/touch`),

  /** GET /v1/channels/sessions/cleanup */
  getCleanupInfo: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/channels/sessions/cleanup', params),

};
