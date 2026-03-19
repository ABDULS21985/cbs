import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Counterparty } from '../types/counterparty';

export const counterpartiesApi = {
  /** PATCH /v1/counterparties/{code}/exposure */
  updateExposure: (code: string) =>
    apiPatch<Counterparty>(`/api/v1/counterparties/${code}/exposure`),

  /** POST /v1/counterparties/{code}/verify-kyc */
  verifyKyc: (code: string) =>
    apiPost<Counterparty>(`/api/v1/counterparties/${code}/verify-kyc`),

  /** GET /v1/counterparties/type/{type} */
  byType: (type: string) =>
    apiGet<Counterparty[]>(`/api/v1/counterparties/type/${type}`),

  /** GET /v1/counterparties/pending-kyc */
  pendingKyc: (params?: Record<string, unknown>) =>
    apiGet<Counterparty[]>('/api/v1/counterparties/pending-kyc', params),

};
