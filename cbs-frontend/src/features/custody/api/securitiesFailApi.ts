import { apiGet, apiPost } from '@/lib/api';
import type { SecuritiesFail } from '../types/securitiesFail';

export const securitiesFailsApi = {
  /** POST /v1/securities-fails/{ref}/escalate */
  escalate: (ref: string) =>
    apiPost<SecuritiesFail>(`/api/v1/securities-fails/${ref}/escalate`),

  /** POST /v1/securities-fails/{ref}/buy-in */
  buyIn: (ref: string) =>
    apiPost<SecuritiesFail>(`/api/v1/securities-fails/${ref}/buy-in`),

  /** POST /v1/securities-fails/{ref}/penalty */
  penalty: (ref: string) =>
    apiPost<SecuritiesFail>(`/api/v1/securities-fails/${ref}/penalty`),

  /** POST /v1/securities-fails/{ref}/resolve */
  resolve: (ref: string) =>
    apiPost<SecuritiesFail>(`/api/v1/securities-fails/${ref}/resolve`),

  /** GET /v1/securities-fails/dashboard */
  dashboard: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/securities-fails/dashboard', params),

  /** GET /v1/securities-fails/counterparty-report */
  counterpartyReport: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/securities-fails/counterparty-report', params),

};
