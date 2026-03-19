import { apiGet, apiPost } from '@/lib/api';
import type { BankDraft } from '../types/bankDraft';

export const bankDraftsApi = {
  /** POST /v1/bank-drafts/{number}/present */
  present: (number: string) =>
    apiPost<BankDraft>(`/api/v1/bank-drafts/${number}/present`),

  /** POST /v1/bank-drafts/{number}/pay */
  pay: (number: string) =>
    apiPost<BankDraft>(`/api/v1/bank-drafts/${number}/pay`),

  /** POST /v1/bank-drafts/{number}/stop */
  stop: (number: string) =>
    apiPost<BankDraft>(`/api/v1/bank-drafts/${number}/stop`),

  /** POST /v1/bank-drafts/{number}/reissue */
  reissue: (number: string) =>
    apiPost<BankDraft>(`/api/v1/bank-drafts/${number}/reissue`),

  /** POST /v1/bank-drafts/expire-overdue */
  expireOverdue: () =>
    apiPost<Record<string, unknown>>('/api/v1/bank-drafts/expire-overdue'),

  /** GET /v1/bank-drafts/customer/{customerId} */
  byCustomer: (customerId: number) =>
    apiGet<BankDraft[]>(`/api/v1/bank-drafts/customer/${customerId}`),

};
