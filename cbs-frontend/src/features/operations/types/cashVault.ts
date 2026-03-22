// Auto-generated from backend entities

export interface CashMovement {
  id: number;
  movementRef: string;
  fromVaultCode: string | null;
  toVaultCode: string | null;
  movementType: string;
  currency: string;
  amount: number;
  denominationDetail: Record<string, unknown> | null;
  citCompany: string | null;
  sealNumber: string | null;
  escortCount: number | null;
  authorizedBy: string | null;
  receivedBy: string | null;
  scheduledDate: string | null;
  actualDate: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashVault {
  id: number;
  vaultCode: string;
  vaultName: string;
  vaultType: string;
  branchId: number | null;
  currency: string;
  totalBalance: number;
  denominationBreakdown: Record<string, unknown> | null;
  insuranceLimit: number | null;
  lastCountedAt: string | null;
  lastReconciledAt: string | null;
  custodianName: string | null;
  dualControl: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

