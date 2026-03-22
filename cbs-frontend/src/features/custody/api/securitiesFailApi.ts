import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';
import type { SecuritiesFail } from '../types/securitiesFail';

export type { SecuritiesFail };

export const securitiesFailsApi = {
  // GET /v1/securities-fails/{ref} — get fail by reference
  getByRef: (ref: string) =>
    apiGet<SecuritiesFail>(`/api/v1/securities-fails/${ref}`),

  // POST /v1/securities-fails — record a new fail (entity body)
  recordFail: (data: Partial<SecuritiesFail>) =>
    apiPost<SecuritiesFail>('/api/v1/securities-fails', data),

  // POST /v1/securities-fails/{ref}/escalate
  escalate: (ref: string) =>
    apiPost<SecuritiesFail>(`/api/v1/securities-fails/${ref}/escalate`),

  // POST /v1/securities-fails/{ref}/buy-in
  buyIn: (ref: string) =>
    apiPost<SecuritiesFail>(`/api/v1/securities-fails/${ref}/buy-in`),

  // POST /v1/securities-fails/{ref}/penalty?dailyRate=... (@RequestParam BigDecimal dailyRate)
  penalty: (ref: string, dailyRate: number) => {
    const params = new URLSearchParams({ dailyRate: String(dailyRate) });
    return api.post<{ data: SecuritiesFail }>(
      `/api/v1/securities-fails/${ref}/penalty?${params}`,
    ).then((r) => r.data.data);
  },

  // POST /v1/securities-fails/{ref}/resolve?action=...&notes=... (@RequestParam String action, notes)
  resolve: (ref: string, action: string, notes: string = '') => {
    const params = new URLSearchParams({ action, notes });
    return api.post<{ data: SecuritiesFail }>(
      `/api/v1/securities-fails/${ref}/resolve?${params}`,
    ).then((r) => r.data.data);
  },

  // GET /v1/securities-fails/dashboard — returns Map<String, Object>
  dashboard: () =>
    apiGet<Record<string, unknown>>('/api/v1/securities-fails/dashboard'),

  // GET /v1/securities-fails/counterparty-report — returns Map<String, Long>
  counterpartyReport: () =>
    apiGet<Record<string, number>>('/api/v1/securities-fails/counterparty-report'),
};
