// Auto-generated from backend entities

export interface VirtualAccount {
  id: number;
  virtualAccountNumber: string;
  masterAccountId: number;
  customerId: number;
  accountName: string;
  accountPurpose: string;
  currency: string;
  virtualBalance: number;
  autoSweepEnabled: boolean;
  sweepThreshold: number;
  sweepTargetBalance: number;
  sweepDirection: string;
  externalReference: string;
  referencePattern: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

