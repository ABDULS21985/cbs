// Auto-generated from backend entities

export interface MarketMakingActivity {
  id: number;
  mandateId: number;
  activityDate: string;
  quotesPublished: number;
  quotesHit: number;
  fillRatioPct: number;
  avgBidAskSpreadBps: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  netPosition: number;
  realizedPnl: number;
  unrealizedPnl: number;
  inventoryTurnover: number;
  quotingUptimePct: number;
  spreadViolationCount: number;
  obligationMet: boolean;
  createdAt: string;
}

export interface MarketMakingMandate {
  id: number;
  mandateCode: string;
  mandateName: string;
  instrumentType: string;
  instrumentCode: string;
  exchange: string;
  mandateType: string;
  deskId: number;
  quoteObligation: string;
  minQuoteSize: number;
  maxQuoteSize: number;
  maxSpreadBps: number;
  minQuoteDurationSeconds: number;
  dailyQuoteHours: number;
  inventoryLimit: number;
  hedgingStrategy: string;
  performanceMetrics: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string;
  regulatoryRef: string;
  status: string;
}

