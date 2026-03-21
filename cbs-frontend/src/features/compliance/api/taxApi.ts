import { apiGet, apiPost } from '@/lib/api';
import type { TaxPreview, TaxRule, TaxTransaction } from '../types/tax';

export const taxApi = {
  /** POST /v1/tax/rules */
  createRule: (data: Partial<TaxRule>) =>
    apiPost<TaxRule>('/api/v1/tax/rules', data),

  /** GET /v1/tax/preview */
  preview: (params?: Record<string, unknown>) =>
    apiGet<TaxPreview[]>('/api/v1/tax/preview', params),

  /** GET /v1/tax/history/account/{accountId} */
  getAccountHistory: (accountId: number) =>
    apiGet<TaxTransaction[]>(`/api/v1/tax/history/account/${accountId}`),

  /** GET /v1/tax/pending-remittance */
  getPendingRemittance: (params?: Record<string, unknown>) =>
    apiGet<TaxTransaction[]>('/api/v1/tax/pending-remittance', params),

};
