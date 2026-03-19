// Auto-generated from backend entities

export interface SecuritiesMovement {
  id: number;
  movementRef: string;
  positionId: string;
  movementType: string;
  quantity: number;
  price: number;
  settlementAmount: number;
  currency: string;
  counterpartyCode: string;
  tradeDate: string;
  settlementDate: string;
  status: string;
  createdAt: string;
}

export interface SecuritiesPosition {
  id: number;
  positionId: string;
  portfolioCode: string;
  custodyAccountCode: string;
  instrumentCode: string;
  instrumentName: string;
  isin: string;
  currency: string;
  quantity: number;
  avgCost: number;
  costBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedGainLoss: number;
  accruedInterest: number;
  settlementT0Count: number;
  settlementT1Count: number;
  settlementT2Count: number;
  pledgedQuantity: number;
  availableQuantity: number;
  lastPricedAt: string;
  positionDate: string;
}

