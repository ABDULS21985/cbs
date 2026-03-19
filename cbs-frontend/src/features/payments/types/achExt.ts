// Auto-generated from backend entities

export interface AchBatch {
  id: number;
  batchId: string;
  achOperator: string;
  batchType: string;
  originatorId: string;
  originatorName: string;
  originatorAccountId: number;
  currency: string;
  totalTransactions: number;
  totalAmount: number;
  effectiveDate: string;
  settlementDate: string;
  fileReference: string;
  status: string;
  rejectionCount: number;
  returnCount: number;
  submittedAt: string;
  settledAt: string;
  createdAt: string;
}

