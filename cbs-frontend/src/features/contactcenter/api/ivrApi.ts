import { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { IvrMenu, IvrSession } from '../types/ivr';

export const ivrApi = {
  /** POST /v1/ivr/menus */
  createMenu: (data: Partial<IvrMenu>) =>
    apiPost<IvrMenu>('/api/v1/ivr/menus', data),

  /** GET /v1/ivr/menus */
  listMenus: (params?: Record<string, unknown>) =>
    apiGet<IvrMenu[]>('/api/v1/ivr/menus', params),

  /** GET /v1/ivr/sessions — list all IVR sessions */
  listSessions: () =>
    apiGet<IvrSession[]>('/api/v1/ivr/sessions'),

  /** POST /v1/ivr/sessions?callerNumber=...&customerId=... */
  startSession: (callerNumber: string, customerId?: number) =>
    apiPostParams<IvrSession>('/api/v1/ivr/sessions', {
      callerNumber,
      ...(customerId != null ? { customerId } : {}),
    }),

  /** POST /v1/ivr/sessions/{sessionId}/navigate?option=... */
  navigateSession: (sessionId: string, option: string) =>
    apiPostParams<IvrSession>(`/api/v1/ivr/sessions/${sessionId}/navigate`, { option }),

  /** POST /v1/ivr/sessions/{sessionId}/transfer?reason=... */
  transfer: (sessionId: string, reason: string) =>
    apiPostParams<IvrSession>(`/api/v1/ivr/sessions/${sessionId}/transfer`, { reason }),
};
