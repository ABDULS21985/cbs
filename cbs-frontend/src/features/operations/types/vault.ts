// Auto-generated from backend entities

export type VaultType = 'MAIN' | 'SUBSIDIARY' | 'ATM' | 'TELLER';

export interface Vault {
  id: number;
  vaultCode: string;
  vaultName: string;
  branchCode: string;
  vaultType: VaultType;
  currencyCode: string;
  currentBalance: number;
  minimumBalance: number | null;
  maximumBalance: number | null;
  insuranceLimit: number | null;
  custodian: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VaultTransaction {
  id: number;
  vault: Vault;
  transactionType: string;
  amount: number;
  runningBalance: number;
  currencyCode: string;
  counterpartyVault: Vault | null;
  reference: string | null;
  narration: string | null;
  performedBy: string;
  approvedBy: string | null;
  createdAt: string;
  version: number;
}

