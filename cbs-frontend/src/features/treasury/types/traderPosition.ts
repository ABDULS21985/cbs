// Auto-generated from backend entities

export interface TraderPosition {
  id: number;
  positionRef: string;
  dealerId: string;
  dealerName: string;
  deskId: number;
  instrumentType: string;
  instrumentCode: string;
  instrumentName: string;
  currency: string;
  longQuantity: number;
  shortQuantity: number;
  netQuantity: number;
  avgCostLong: number;
  avgCostShort: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
  traderPositionLimit: number;
  limitUtilizationPct: number;
  limitBreached: boolean;
  positionDate: string;
  lastTradeAt: string;
  status: string;
}

export interface TraderPositionLimit {
  id: number;
  dealerId: string;
  limitType: string;
  instrumentType: string;
  currency: string;
  limitAmount: number;
  warningThresholdPct: number;
  currentUtilization: number;
  utilizationPct: number;
  lastBreachDate: string;
  breachCount: number;
  approvedBy: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
}

