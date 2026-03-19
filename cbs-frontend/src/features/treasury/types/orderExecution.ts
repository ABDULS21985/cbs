// Auto-generated from backend entities

export interface ExecutionQuality {
  id: number;
  orderId: number;
  benchmarkType: string;
  benchmarkPrice: number;
  avgExecutionPrice: number;
  slippageBps: number;
  implementationShortfall: number;
  marketImpactBps: number;
  timingCostBps: number;
  executionDurationSeconds: number;
  fillRatePct: number;
  numberOfFills: number;
  analysisDate: string;
  createdAt: string;
}

export interface OrderExecution {
  id: number;
  executionRef: string;
  orderId: number;
  executionType: string;
  executionVenue: string;
  executionPrice: number;
  executionQuantity: number;
  executionAmount: number;
  currency: string;
  counterpartyCode: string;
  counterpartyName: string;
  commissionCharged: number;
  stampDuty: number;
  levyAmount: number;
  netSettlementAmount: number;
  tradeDate: string;
  settlementDate: string;
  settlementCycle: string;
  confirmationRef: string;
  executedAt: string;
  reportedToExchange: boolean;
  reportedAt: string;
  exchangeTradeId: string;
  status: string;
  createdAt: string;
}

