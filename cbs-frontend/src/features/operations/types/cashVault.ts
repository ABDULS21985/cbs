// Auto-generated from backend entities

export interface CashMovement {
  id: number;
  movementRef: string;
  fromVaultCode: string;
  toVaultCode: string;
  movementType: string;
  currency: string;
  amount: number;
  denominationDetail: Record<string, unknown>;
  citCompany: string;
  sealNumber: string;
  escortCount: number;
  authorizedBy: string;
  receivedBy: string;
  scheduledDate: string;
  actualDate: string;
  status: string;
}

export interface CashVault {
  id: number;
  vaultCode: string;
  vaultName: string;
  vaultType: string;
  branchId: number;
  currency: string;
  totalBalance: number;
  denominationBreakdown: Record<string, unknown>;
  insuranceLimit: number;
  lastCountedAt: string;
  lastReconciledAt: string;
  custodianName: string;
  dualControl: boolean;
  status: string;
}

