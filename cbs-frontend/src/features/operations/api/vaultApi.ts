import { apiGet, apiPost } from '@/lib/api';
import type { Vault, VaultTransaction } from '../types/vault';

export const vaultsApi = {
  /** GET /v1/vaults/{id} */
  getVault: (id: number) =>
    apiGet<Vault>(`/api/v1/vaults/${id}`),

  /** GET /v1/vaults/branch/{branchCode} */
  getBranchVaults: (branchCode: string) =>
    apiGet<Vault[]>(`/api/v1/vaults/branch/${branchCode}`),

  /** POST /v1/vaults/{id}/cash-in */
  cashIn: (id: number) =>
    apiPost<VaultTransaction>(`/api/v1/vaults/${id}/cash-in`),

  /** POST /v1/vaults/{id}/cash-out */
  cashOut: (id: number) =>
    apiPost<VaultTransaction>(`/api/v1/vaults/${id}/cash-out`),

  /** POST /v1/vaults/transfer */
  transfer: () =>
    apiPost<void>('/api/v1/vaults/transfer'),

  /** GET /v1/vaults/{id}/transactions */
  getTransactions: (id: number) =>
    apiGet<VaultTransaction[]>(`/api/v1/vaults/${id}/transactions`),

};
