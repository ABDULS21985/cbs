export interface MarketMakingMandate {
  id: number;
  mandateCode: string;
  mandateName: string;
  instrumentType: string;
  instrumentCode: string;
  exchange: string;
  mandateType: 'DESIGNATED' | 'VOLUNTARY' | 'INTERBANK' | 'PRIMARY_DEALER';
  deskId: number;
  quoteObligation: 'CONTINUOUS' | 'ON_REQUEST' | 'SCHEDULED';
  minQuoteSize: number;
  maxQuoteSize: number;
  maxSpreadBps: number;
  minQuoteDurationSeconds: number;
  dailyQuoteHours: number;
  inventoryLimit: number;
  hedgingStrategy: 'FULL_HEDGE' | 'PARTIAL_HEDGE' | 'DISCRETIONARY' | 'NONE';
  effectiveFrom: string;
  effectiveTo?: string;
  regulatoryRef?: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  createdAt?: string;
  updatedAt?: string;
}

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
