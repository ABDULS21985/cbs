// Auto-generated from backend entities

export interface CardClearingBatch {
  id: number;
  batchId: string;
  network: string;
  batchType: string;
  clearingDate: string;
  settlementDate: string;
  currency: string;
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  interchangeAmount: number;
  netSettlementAmount: number;
  fileReference: string;
  status: string;
  exceptionCount: number;
  reconciledAt: string;
  createdAt: string;
}

export interface CardSettlementPosition {
  id: number;
  settlementDate: string;
  network: string;
  counterpartyBic: string;
  counterpartyName: string;
  currency: string;
  grossDebits: number;
  grossCredits: number;
  interchangeReceivable: number;
  interchangePayable: number;
  schemeFees: number;
  netPosition: number;
  settlementAccountId: number;
  status: string;
  settledAt: string;
  createdAt: string;
}

