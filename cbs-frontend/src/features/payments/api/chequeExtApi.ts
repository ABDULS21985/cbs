import { apiGet, apiPostParams } from '@/lib/api';
import type { ChequeBook, ChequeLeaf } from '../types/chequeExt';

export const chequesApi = {
  /** GET /v1/cheques/books/account/{accountId} */
  getActiveBooks: (accountId: number) =>
    apiGet<ChequeBook[]>(`/api/v1/cheques/books/account/${accountId}`),

  /** POST /v1/cheques/present — requires accountId, chequeNumber, amount, payeeName */
  present: (data: {
    accountId: number;
    chequeNumber: string;
    amount: number;
    payeeName: string;
    presentingBankCode?: string;
  }) =>
    apiPostParams<ChequeLeaf>('/api/v1/cheques/present', data),

  /** POST /v1/cheques/{leafId}/clear */
  clear: (leafId: number) =>
    apiPostParams<ChequeLeaf>(`/api/v1/cheques/${leafId}/clear`, {}),

  /** POST /v1/cheques/stop — requires accountId, chequeNumber, reason */
  stop: (data: {
    accountId: number;
    chequeNumber: string;
    reason: string;
  }) =>
    apiPostParams<ChequeLeaf>('/api/v1/cheques/stop', data),

  /** GET /v1/cheques/account/{accountId} */
  getAccountCheques: (accountId: number) =>
    apiGet<ChequeLeaf[]>(`/api/v1/cheques/account/${accountId}`),

};
