import { apiGet, apiPost } from '@/lib/api';
import type { LoyaltyAccount, LoyaltyProgram, LoyaltyTransaction } from '../types/loyalty';

export const loyaltyApi = {
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
