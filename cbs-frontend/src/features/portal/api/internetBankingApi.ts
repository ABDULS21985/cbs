import { apiGet, apiPost } from '@/lib/api';
import type { InternetBankingFeature, InternetBankingSession } from '../types/internetBanking';

export const internetBankingApi = {
  /** POST /v1/internet-banking/login */
  login: () =>
    apiPost<InternetBankingSession>('/api/v1/internet-banking/login'),

  /** POST /v1/internet-banking/sessions/{sessionId}/mfa-complete */
  completeMfa: (sessionId: number) =>
    apiPost<InternetBankingSession>(`/api/v1/internet-banking/sessions/${sessionId}/mfa-complete`),

  /** POST /v1/internet-banking/sessions/{sessionId}/touch */
  touch: (sessionId: number) =>
    apiPost<InternetBankingSession>(`/api/v1/internet-banking/sessions/${sessionId}/touch`),

  /** POST /v1/internet-banking/sessions/{sessionId}/logout */
  logout: (sessionId: number) =>
    apiPost<void>(`/api/v1/internet-banking/sessions/${sessionId}/logout`),

  /** GET /v1/internet-banking/sessions/{sessionId}/features */
  features: (sessionId: number) =>
    apiGet<InternetBankingFeature[]>(`/api/v1/internet-banking/sessions/${sessionId}/features`),

  /** GET /v1/internet-banking/sessions/{sessionId}/can-access/{featureCode} */
  canAccess: (sessionId: number, featureCode: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/internet-banking/sessions/${sessionId}/can-access/${featureCode}`),

  /** POST /v1/internet-banking/sessions/expire-idle */
  expireIdle: () =>
    apiPost<Record<string, unknown>>('/api/v1/internet-banking/sessions/expire-idle'),

};
