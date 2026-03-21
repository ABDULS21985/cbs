import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { TransactionLimit, TransactionLimitUsage, LimitType } from '../types/transactionLimit';

export const transactionLimitApi = {
  /** POST /v1/limits — Create a transaction limit (Admin only) */
  create: (data: Partial<TransactionLimit>) =>
    apiPost<TransactionLimit>('/api/v1/limits', data),

  /** PATCH /v1/limits/{id}?maxAmount=X&maxCount=Y — Update limit (Admin only) */
  update: (id: number, params: { maxAmount?: number; maxCount?: number }) =>
    apiPatch<TransactionLimit>(
      `/api/v1/limits/${id}?${new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`,
    ),

  /** GET /v1/limits/account/{accountId} — Get limits for an account */
  getByAccount: (accountId: number) =>
    apiGet<TransactionLimit[]>(`/api/v1/limits/account/${accountId}`),

  /** GET /v1/limits/usage/{accountId}/{limitType} — Get today's usage */
  getUsage: (accountId: number, limitType: LimitType) =>
    apiGet<TransactionLimitUsage | null>(`/api/v1/limits/usage/${accountId}/${limitType}`),
};
