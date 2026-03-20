export interface MarginCall {
  id: number;
  callRef: string;
  callDirection: 'OUTGOING' | 'INCOMING';
  counterpartyCode: string;
  counterpartyName: string;
  callType: string;
  currency: string;
  callAmount: number;
  portfolioMtm: number;
  thresholdAmount: number;
  minimumTransfer: number;
  independentAmount: number;
  agreedAmount: number;
  disputeAmount: number;
  disputeReason: string;
  collateralType: string;
  settledAmount: number;
  settlementDate: string;
  callDate: string;
  responseDeadline: string;
  status: 'ISSUED' | 'ACKNOWLEDGED' | 'SETTLED' | 'DISPUTED' | 'EXPIRED';
}

export interface CollateralPosition {
  id: number;
  positionCode: string;
  counterpartyCode: string;
  counterpartyName: string;
  direction: 'LONG' | 'SHORT';
  collateralType: string;
  currency: string;
  marketValue: number;
  haircutPct: number;
  adjustedValue: number;
  eligible: boolean;
  concentrationLimitPct: number;
  maturityDate: string;
  revaluationDate: string;
  status: string;
}
