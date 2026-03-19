import { apiGet, apiPost } from '@/lib/api';
import type {
  CurrencyWallet,
  WalletCreateRequest,
  WalletCreditRequest,
  WalletDebitRequest,
  WalletConvertRequest,
  WalletTransaction,
} from '../types/wallet';

export const walletsApi = {
  /** POST /v1/wallets/account/{accountId} */
  addWallet: (accountId: number, body: WalletCreateRequest) =>
    apiPost<CurrencyWallet>(`/api/v1/wallets/account/${accountId}`, body),

  /** GET /v1/wallets/account/{accountId} */
  getWallets: (accountId: number) =>
    apiGet<CurrencyWallet[]>(`/api/v1/wallets/account/${accountId}`),

  /** POST /v1/wallets/account/{accountId}/credit */
  credit: (accountId: number, body: WalletCreditRequest) =>
    apiPost<CurrencyWallet>(`/api/v1/wallets/account/${accountId}/credit`, body),

  /** POST /v1/wallets/account/{accountId}/debit */
  debit: (accountId: number, body: WalletDebitRequest) =>
    apiPost<CurrencyWallet>(`/api/v1/wallets/account/${accountId}/debit`, body),

  /** POST /v1/wallets/account/{accountId}/convert */
  convert: (accountId: number, body: WalletConvertRequest) =>
    apiPost<number>(`/api/v1/wallets/account/${accountId}/convert`, body),

  /** GET /v1/wallets/{walletId}/transactions */
  transactions: (walletId: number) =>
    apiGet<WalletTransaction[]>(`/api/v1/wallets/${walletId}/transactions`),
};
