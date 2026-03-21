import { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { ChannelSession } from './channelApi';

export const channelsExtApi = {
  /** GET /v1/channels/sessions — list all sessions (paged) */
  listSessions: (params?: Record<string, unknown>) =>
    apiGet<ChannelSession[]>('/api/v1/channels/sessions', params),

  /** POST /v1/channels/sessions/{sessionId}/touch — @PathVariable String sessionId */
  touch: (sessionId: string) =>
    apiPost<void>(`/api/v1/channels/sessions/${sessionId}/touch`),

  /** GET /v1/channels/sessions/cleanup — returns Map<String, Integer> */
  getCleanupInfo: (params?: Record<string, unknown>) =>
    apiGet<Record<string, number>>('/api/v1/channels/sessions/cleanup', params),

  /** POST /v1/channels/sessions/{sessionId}/handoff — @RequestParam targetChannel, deviceId, ipAddress */
  handoff: (
    sessionId: string,
    params: { targetChannel: string; deviceId?: string; ipAddress?: string },
  ) =>
    apiPostParams<ChannelSession>(
      `/api/v1/channels/sessions/${sessionId}/handoff`,
      params as Record<string, unknown>,
    ),

  /** POST /v1/channels/sessions — @RequestParam channel, customerId, deviceId, deviceType, ipAddress, userAgent */
  createSession: (params: {
    channel: string;
    customerId?: number;
    deviceId?: string;
    deviceType?: string;
    ipAddress?: string;
    userAgent?: string;
  }) =>
    apiPostParams<ChannelSession>(
      '/api/v1/channels/sessions',
      params as Record<string, unknown>,
    ),
};

// Keep the old export name for any imports that used it
export const channelsApi = channelsExtApi;
