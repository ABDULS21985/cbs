// Auto-generated from backend entities

export interface MarginCall {
  id: number;
  callRef: string;
  callDirection: string;
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
  status: string;
}

