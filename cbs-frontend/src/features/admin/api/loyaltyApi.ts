import { apiGet, apiPost } from '@/lib/api';
import type { LoyaltyAccount, LoyaltyProgram, LoyaltyTransaction } from '../types/loyalty';

export const loyaltyApi = {
  /** GET /v1/loyalty/programs — list all programs */
  getPrograms: () =>
    apiGet<LoyaltyProgram[]>('/api/v1/loyalty/programs'),

  /** GET /v1/loyalty/enroll — list all accounts */
  getAccounts: () =>
    apiGet<LoyaltyAccount[]>('/api/v1/loyalty/enroll'),

  /** POST /v1/loyalty/programs */
  createProgram: (data: Partial<LoyaltyProgram>) =>
    apiPost<LoyaltyProgram>('/api/v1/loyalty/programs', data),

  /** POST /v1/loyalty/enroll */
  enroll: () =>
    apiPost<LoyaltyAccount>('/api/v1/loyalty/enroll'),

  /** POST /v1/loyalty/{loyaltyNumber}/earn */
  earn: (loyaltyNumber: string) =>
    apiPost<LoyaltyAccount>(`/api/v1/loyalty/${loyaltyNumber}/earn`),

  /** POST /v1/loyalty/{loyaltyNumber}/redeem */
  redeem: (loyaltyNumber: string) =>
    apiPost<LoyaltyAccount>(`/api/v1/loyalty/${loyaltyNumber}/redeem`),

  /** GET /v1/loyalty/customer/{customerId} */
  getCustomerAccounts: (customerId: number) =>
    apiGet<LoyaltyAccount[]>(`/api/v1/loyalty/customer/${customerId}`),

  /** GET /v1/loyalty/{loyaltyNumber}/transactions */
  getTransactions: (loyaltyNumber: string) =>
    apiGet<LoyaltyTransaction[]>(`/api/v1/loyalty/${loyaltyNumber}/transactions`),

};
