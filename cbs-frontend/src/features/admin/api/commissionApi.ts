import { apiGet, apiPost } from '@/lib/api';
import type { CommissionAgreement, CommissionPayout } from '../types/commission';

export const commissionsApi = {
  /** POST /v1/commissions/agreements */
  createAgreement: (data: Partial<CommissionAgreement>) =>
    apiPost<CommissionAgreement>('/api/v1/commissions/agreements', data),

  /** POST /v1/commissions/agreements/{code}/activate */
  createAgreement2: (code: string, data: Partial<CommissionAgreement>) =>
    apiPost<CommissionAgreement>(`/api/v1/commissions/agreements/${code}/activate`, data),

  /** POST /v1/commissions/agreements/{code}/calculate-payout */
  calculatePayout: (code: string) =>
    apiPost<CommissionPayout>(`/api/v1/commissions/agreements/${code}/calculate-payout`),

  /** POST /v1/commissions/payouts/{code}/approve */
  calculatePayout2: (code: string) =>
    apiPost<CommissionPayout>(`/api/v1/commissions/payouts/${code}/approve`),

  /** GET /v1/commissions/agreements/party/{id} */
  getAgreementsByParty: (id: number) =>
    apiGet<CommissionAgreement[]>(`/api/v1/commissions/agreements/party/${id}`),

  /** GET /v1/commissions/payouts/party/{id} */
  getAgreementsByParty2: (id: number) =>
    apiGet<CommissionAgreement[]>(`/api/v1/commissions/payouts/party/${id}`),

};
