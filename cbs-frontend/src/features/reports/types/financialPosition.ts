// Auto-generated from backend entities

export interface FinancialPosition {
  id: number;
  positionCode: string;
  positionType: string;
  positionCategory: string;
  identifier: string;
  identifierName: string;
  currency: string;
  longPosition: number;
  shortPosition: number;
  netPosition: number;
  positionLimit: number;
  limitUtilizationPct: number;
  limitBreach: boolean;
  avgCost: number;
  markToMarket: number;
  unrealizedPnl: number;
  positionDate: string;
}

