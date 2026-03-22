import { apiGet, apiPostParams } from '@/lib/api';
import type { Vault, VaultType, VaultTransaction } from '../types/vault';

export interface CreateVaultRequest {
  vaultCode: string;
  vaultName: string;
  branchCode: string;
  vaultType: VaultType;
  currencyCode: string;
  minimumBalance?: number;
  maximumBalance?: number;
  insuranceLimit?: number;
  custodian?: string;
}

export interface CashInOutRequest {
  amount: number;
  reference?: string;
  narration?: string;
}

export interface VaultTransferRequest {
  fromVaultId: number;
  toVaultId: number;
  amount: number;
}

export const vaultsApi = {
  /** POST /v1/vaults — create a new vault */
  create: (data: CreateVaultRequest) =>
    apiPostParams<Vault>('/api/v1/vaults', data),

  /** GET /v1/vaults */
  getVaults: (branchCode?: string) =>
    apiGet<Vault[]>('/api/v1/vaults', branchCode ? { branchCode } : undefined),

  /** GET /v1/vaults/{id} */
  getVault: (id: number) =>
    apiGet<Vault>(`/api/v1/vaults/${id}`),

  /** GET /v1/vaults/branch/{branchCode} */
  getBranchVaults: (branchCode: string) =>
    apiGet<Vault[]>(`/api/v1/vaults/branch/${branchCode}`),

  /** POST /v1/vaults/{id}/cash-in — requires amount, optional reference + narration */
  cashIn: (id: number, data: CashInOutRequest) =>
    apiPostParams<VaultTransaction>(`/api/v1/vaults/${id}/cash-in`, {
      amount: data.amount,
      reference: data.reference,
      narration: data.narration,
    }),

  /** POST /v1/vaults/{id}/cash-out — requires amount, optional reference + narration */
  cashOut: (id: number, data: CashInOutRequest) =>
    apiPostParams<VaultTransaction>(`/api/v1/vaults/${id}/cash-out`, {
      amount: data.amount,
      reference: data.reference,
      narration: data.narration,
    }),

  /** POST /v1/vaults/transfer — inter-vault transfer */
  transfer: (data: VaultTransferRequest) =>
    apiPostParams<void>('/api/v1/vaults/transfer', {
      fromVaultId: data.fromVaultId,
      toVaultId: data.toVaultId,
      amount: data.amount,
    }),

  /** GET /v1/vaults/transactions or /v1/vaults/{id}/transactions */
  getTransactions: (id?: number, page = 0, size = 20) =>
    id == null
      ? apiGet<VaultTransaction[]>('/api/v1/vaults/transactions', { page, size })
      : apiGet<VaultTransaction[]>(`/api/v1/vaults/${id}/transactions`, { page, size }),

};
