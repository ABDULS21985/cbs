import { apiGet, apiPost } from '@/lib/api';
import type { CurrencyWallet } from '../types/wallet';

export const walletsApi = {
  /** POST /v1/wallets/account/{accountId} */
  addWallet: (accountId: number) =>
    apiPost<CurrencyWallet>(`/api/v1/wallets/account/${accountId}`),

  /** GET /v1/wallets/account/{accountId} */
  getWallets: (accountId: number) =>
    apiGet<CurrencyWallet[]>(`/api/v1/wallets/account/${accountId}`),

  /** POST /v1/wallets/account/{accountId}/credit */
  credit: (accountId: number) =>
    apiPost<CurrencyWallet>(`/api/v1/wallets/account/${accountId}/credit`),

  /** POST /v1/wallets/account/{accountId}/debit */
  debit: (accountId: number) =>
    apiPost<CurrencyWallet>(`/api/v1/wallets/account/${accountId}/debit`),

  /** POST /v1/wallets/account/{accountId}/convert */
  convert: (accountId: number) =>
    apiPost<number>(`/api/v1/wallets/account/${accountId}/convert`),

};
