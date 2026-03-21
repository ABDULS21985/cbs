import { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { CommissionAgreement, CommissionPayout } from '../types/commission';

export const commissionsApi = {
  /** GET /v1/commissions/agreements — list all */
  getAllAgreements: () =>
    apiGet<CommissionAgreement[]>('/api/v1/commissions/agreements'),

  /** POST /v1/commissions/agreements */
  createAgreement: (data: Partial<CommissionAgreement>) =>
    apiPost<CommissionAgreement>('/api/v1/commissions/agreements', data),

  /** POST /v1/commissions/agreements/{code}/activate */
  activateAgreement: (code: string) =>
    apiPost<CommissionAgreement>(`/api/v1/commissions/agreements/${code}/activate`),

  /** GET /v1/commissions/agreements/{code} */
  getAgreementByCode: (code: string) =>
    apiGet<CommissionAgreement>(`/api/v1/commissions/agreements/${code}`),

  /** POST /v1/commissions/agreements/{code}/calculate-payout (query params) */
  calculatePayout: async (code: string, params: { grossSales: number; qualifyingSales: number; period: string }): Promise<CommissionPayout> => {
    return apiPostParams<CommissionPayout>(`/api/v1/commissions/agreements/${code}/calculate-payout`, params as Record<string, unknown>);
  },

  /** POST /v1/commissions/payouts/{code}/approve */
  approvePayout: (code: string) =>
    apiPost<CommissionPayout>(`/api/v1/commissions/payouts/${code}/approve`),

  /** GET /v1/commissions/agreements/party/{id} */
  getAgreementsByParty: (partyId: string) =>
    apiGet<CommissionAgreement[]>(`/api/v1/commissions/agreements/party/${partyId}`),

  /** GET /v1/commissions/payouts/party/{id} */
  getPayoutsByParty: (partyId: string) =>
    apiGet<CommissionPayout[]>(`/api/v1/commissions/payouts/party/${partyId}`),
};
