// Auto-generated from backend entities

export interface ClearingSubmission {
  id: number;
  submissionRef: string;
  tradeRef: string;
  ccpName: string;
  ccpCode: string;
  instrumentType: string;
  clearingMemberId: string;
  tradeDate: string;
  settlementDate: string;
  currency: string;
  notionalAmount: number;
  initialMargin: number;
  variationMargin: number;
  marginCurrency: string;
  submittedAt: string;
  clearedAt: string;
  status: string;
  rejectionReason: string;
}

export interface OrderAllocation {
  id: number;
  allocationRef: string;
  blockOrderRef: string;
  instrumentCode: string;
  instrumentName: string;
  orderSide: string;
  totalQuantity: number;
  totalAmount: number;
  avgPrice: number;
  allocationMethod: string;
  allocations: Record<string, unknown>;
  allocatedAt: string;
  status: string;
}

export interface TradeConfirmation {
  id: number;
  confirmationRef: string;
  tradeRef: string;
  instrumentType: string;
  ourSide: string;
  counterpartyCode: string;
  counterpartyName: string;
  tradeDate: string;
  settlementDate: string;
  currency: string;
  amount: number;
  price: number;
  ourDetails: Record<string, unknown>;
  counterpartyDetails: Record<string, unknown>;
  matchStatus: string;
  breakFields: Record<string, unknown>;
  matchedAt: string;
  status: string;
}

export interface TradeReport {
  id: number;
  reportRef: string;
  tradeRef: string;
  reportType: string;
  regime: string;
  tradeRepository: string;
  reportData: Record<string, unknown>;
  uti: string;
  lei: string;
  submittedAt: string;
  submissionRef: string;
  acknowledgementRef: string;
  status: string;
  rejectionReason: string;
}

