import { apiGet, apiPost } from '@/lib/api';
import type { ChequeBook, ChequeLeaf } from '../types/chequeExt';

export const chequesApi = {
  /** GET /v1/cheques/books/account/{accountId} */
  getActiveBooks: (accountId: number) =>
    apiGet<ChequeBook[]>(`/api/v1/cheques/books/account/${accountId}`),

  /** POST /v1/cheques/present */
  present: () =>
    apiPost<ChequeLeaf>('/api/v1/cheques/present'),

  /** POST /v1/cheques/{leafId}/clear */
  clear: (leafId: number) =>
    apiPost<ChequeLeaf>(`/api/v1/cheques/${leafId}/clear`),

  /** POST /v1/cheques/stop */
  stop: () =>
    apiPost<ChequeLeaf>('/api/v1/cheques/stop'),

  /** GET /v1/cheques/account/{accountId} */
  getAccountCheques: (accountId: number) =>
    apiGet<ChequeLeaf[]>(`/api/v1/cheques/account/${accountId}`),

};
