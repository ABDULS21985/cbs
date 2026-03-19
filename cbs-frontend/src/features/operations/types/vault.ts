// Auto-generated from backend entities

export interface Vault {
  id: number;
  vaultCode: string;
  vaultName: string;
  branchCode: string;
  vaultType: VaultType;
  currencyCode: string;
  currentBalance: number;
  minimumBalance: number;
  maximumBalance: number;
  insuranceLimit: number;
  custodian: string;
  status: string;
}

export interface VaultTransaction {
  id: number;
  vault: Vault;
  transactionType: string;
  amount: number;
  runningBalance: number;
  currencyCode: string;
  counterpartyVault: Vault;
  reference: string;
  narration: string;
  performedBy: string;
  approvedBy: string;
  createdAt: string;
  version: number;
}

