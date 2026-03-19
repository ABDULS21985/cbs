// Auto-generated from backend entities

export interface BankPortfolio {
  id: number;
  portfolioCode: string;
  portfolioName: string;
  portfolioType: string;
  currency: string;
  totalValue: number;
  unrealizedPnl: number;
  realizedPnlYtd: number;
  yieldToMaturity: number;
  modifiedDuration: number;
  convexity: number;
  creditSpreadBps: number;
  var991d: number;
  benchmark: string;
  trackingErrorBps: number;
  assetCount: number;
  lastRebalancedAt: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

