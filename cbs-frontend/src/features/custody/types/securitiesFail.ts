// Auto-generated from backend entities

export interface SecuritiesFail {
  id: number;
  failRef: string;
  settlementInstructionId: number;
  instrumentCode: string;
  instrumentName: string;
  isin: string;
  failType: string;
  counterpartyCode: string;
  counterpartyName: string;
  originalSettlementDate: string;
  currentExpectedDate: string;
  failStartDate: string;
  agingDays: number;
  agingBucket: string;
  quantity: number;
  amount: number;
  currency: string;
  penaltyAccrued: number;
  buyInEligible: boolean;
  buyInDeadline: string;
  escalationLevel: string;
  resolutionAction: string;
  resolutionNotes: string;
  resolvedAt?: string;
  status: string;
}

