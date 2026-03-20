import { apiGet, apiPost } from '@/lib/api';
import type { IvrMenu, IvrSession } from '../types/ivr';

export const ivrApi = {
  /** POST /v1/ivr/menus */
  createMenu: (data: Partial<IvrMenu>) =>
    apiPost<IvrMenu>('/api/v1/ivr/menus', data),

  /** GET /v1/ivr/menus */
  listMenus: (params?: Record<string, unknown>) =>
    apiGet<IvrMenu[]>('/api/v1/ivr/menus', params),

  /** POST /v1/ivr/sessions */
  startSession: () =>
    apiPost<IvrSession>('/api/v1/ivr/sessions'),

  /** POST /v1/ivr/sessions/{sessionId}/navigate */
  navigateSession: (sessionId: number) =>
    apiPost<IvrSession>(`/api/v1/ivr/sessions/${sessionId}/navigate`),

  /** POST /v1/ivr/sessions/{sessionId}/transfer */
  transfer: (sessionId: number) =>
    apiPost<IvrSession>(`/api/v1/ivr/sessions/${sessionId}/transfer`),

};
