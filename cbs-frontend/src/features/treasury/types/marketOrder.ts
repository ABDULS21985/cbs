// Auto-generated from backend entities

export interface MarketOrder {
  id: number;
  orderRef: string;
  orderSource: string;
  customerId: number;
  dealerId: string;
  deskId: number;
  portfolioCode: string;
  orderType: string;
  side: string;
  instrumentType: string;
  instrumentCode: string;
  instrumentName: string;
  exchange: string;
  quantity: number;
  limitPrice: number;
  stopPrice: number;
  currency: string;
  timeInForce: string;
  expiryDate: string;
  filledQuantity: number;
  avgFilledPrice: number;
  filledAmount: number;
  remainingQuantity: number;
  commissionAmount: number;
  commissionCurrency: string;
  suitabilityCheckId: number;
  suitabilityResult: string;
  validationErrors: Record<string, unknown>;
  routedTo: string;
  routedAt: string;
  filledAt: string;
  cancelledReason?: string;
  status: string;
}

