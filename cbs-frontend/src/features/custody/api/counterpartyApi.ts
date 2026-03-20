import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Counterparty } from '../types/counterparty';

export const counterpartiesApi = {
  /** POST /v1/counterparties */
  create: (data: {
    counterpartyCode: string;
    counterpartyName: string;
    counterpartyType: string;
    lei?: string;
    bicCode?: string;
    country: string;
    creditRating?: string;
    ratingAgency?: string;
    totalExposureLimit: number;
    riskCategory: string;
    nettingAgreement?: boolean;
    isdaAgreement?: boolean;
    csaAgreement?: boolean;
  }) => apiPost<Counterparty>('/api/v1/counterparties', data),

  /** PATCH /v1/counterparties/{code}/exposure */
  updateExposure: (code: string, currentExposure: number) =>
    apiPatch<Counterparty>(`/api/v1/counterparties/${code}/exposure`, { currentExposure }),

  /** POST /v1/counterparties/{code}/verify-kyc */
  verifyKyc: (code: string, data: { reviewedBy: string; kycStatus: string; reviewDate: string }) =>
    apiPost<Counterparty>(`/api/v1/counterparties/${code}/verify-kyc`, data),

  /** GET /v1/counterparties/type/{type} */
  byType: (type: string) =>
    apiGet<Counterparty[]>(`/api/v1/counterparties/type/${type}`),

  /** GET /v1/counterparties/pending-kyc */
  pendingKyc: (params?: Record<string, unknown>) =>
    apiGet<Counterparty[]>('/api/v1/counterparties/pending-kyc', params),
};
