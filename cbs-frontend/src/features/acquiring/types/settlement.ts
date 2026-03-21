// Auto-generated from backend entities

export interface SettlementBatch {
  id: number;
  batchRef: string;
  depositoryCode: string;
  settlementDate: string;
  totalInstructions: number;
  settledCount: number;
  failedCount: number;
  pendingCount: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  netAmount: number;
  currency: string;
  cutoffTime: string;
  submittedAt: string;
  completedAt?: string;
  status: string;
}

export interface SettlementInstruction {
  id: number;
  instructionRef: string;
  custodyAccountId: number;
  tradeRef: string;
  instructionType: string;
  settlementCycle: string;
  instrumentCode: string;
  instrumentName: string;
  isin: string;
  quantity: number;
  settlementAmount: number;
  currency: string;
  counterpartyCode: string;
  counterpartyName: string;
  counterpartyBic: string;
  counterpartyAccountRef: string;
  depositoryCode: string;
  placeOfSettlement: string;
  intendedSettlementDate: string;
  actualSettlementDate: string;
  matchStatus: string;
  matchedAt: string;
  priorityFlag: boolean;
  holdReason: string;
  failReason: string;
  failedSince: string;
  penaltyAmount: number;
  status: string;
}

