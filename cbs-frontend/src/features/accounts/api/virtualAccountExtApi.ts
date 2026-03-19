import { apiPost } from '@/lib/api';
import type { VirtualAccount } from '../types/virtualAccountExt';
import type { VASweepHistory } from './virtualAccountApi';

export const virtualAccountsApi = {
  /** POST /v1/virtual-accounts/{number}/credit?amount=&reference= */
  credit: (number: string, amount: number, reference?: string) => {
    const params = new URLSearchParams({ amount: String(amount) });
    if (reference) params.set('reference', reference);
    return apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${number}/credit?${params}`);
  },

  /** POST /v1/virtual-accounts/{number}/debit?amount= */
  debit: (number: string, amount: number) =>
    apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${number}/debit?amount=${amount}`),

  /** POST /v1/virtual-accounts/sweep (bulk) */
  sweep: () =>
    apiPost<Record<string, unknown>>('/api/v1/virtual-accounts/sweep'),

  /** POST /v1/virtual-accounts/{number}/sweep (single VA manual sweep) */
  sweepSingle: (number: string) =>
    apiPost<VASweepHistory>(`/api/v1/virtual-accounts/${number}/sweep`),

  /** POST /v1/virtual-accounts/{number}/activate */
  activate: (number: string) =>
    apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${number}/activate`),

  /** POST /v1/virtual-accounts/{number}/deactivate */
  deactivate: (number: string) =>
    apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${number}/deactivate`),
};
