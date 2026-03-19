import { apiPost } from '@/lib/api';
import type { VirtualAccount } from '../types/virtualAccountExt';

export const virtualAccountsApi = {
  /** POST /v1/virtual-accounts/{number}/credit */
  credit: (number: string) =>
    apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${number}/credit`),

  /** POST /v1/virtual-accounts/{number}/debit */
  debit: (number: string) =>
    apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${number}/debit`),

  /** POST /v1/virtual-accounts/sweep */
  sweep: () =>
    apiPost<Record<string, unknown>>('/api/v1/virtual-accounts/sweep'),

  /** POST /v1/virtual-accounts/{number}/deactivate */
  deactivate: (number: string) =>
    apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${number}/deactivate`),

};
