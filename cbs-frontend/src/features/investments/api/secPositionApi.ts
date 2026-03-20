import { apiGet, apiPost } from '@/lib/api';

export interface SecPosition {
  id: number; positionId: string; portfolioCode: string; instrumentCode: string;
  instrumentName: string; isin: string; instrumentType: string; currency: string;
  quantity: number; avgCost: number; costBasis: number; marketPrice: number;
  marketValue: number; unrealizedPnl: number; unrealizedPnlPct: number;
  accruedInterest: number; lastPricedAt: string; positionDate: string;
}

export interface SecMovement {
  id: number; movementRef: string; positionId: string; movementDate: string;
  instrumentCode: string; instrumentName: string; movementType: string;
  quantity: number; price: number; settlementAmount: number; currency: string;
  counterpartyCode: string; counterpartyName: string; portfolioCode: string;
  tradeDate: string; settlementDate: string; status: string; createdAt: string;
}

export interface PortfolioPositionSummary {
  portfolioCode: string; portfolioName: string; totalMarketValue: number;
  currency: string; positionCount: number;
  byAssetClass: { assetClass: string; marketValue: number; percentage: number; count: number }[];
  positions: SecPosition[];
}

export const secPositionApi = {
  recordPosition: (data: Partial<SecPosition>) =>
    apiPost<SecPosition>('/api/v1/securities-positions', data),
  listMovements: (params?: Record<string, unknown>) =>
    apiGet<SecMovement[]>('/api/v1/securities-positions/movements', params),
  recordMovement: (data: Partial<SecMovement>) =>
    apiPost<SecMovement>('/api/v1/securities-positions/movements', data),
  getByPortfolio: (code: string) =>
    apiGet<SecPosition[]>(`/api/v1/securities-positions/portfolio/${code}`),
  getPositionMovements: (positionId: string) =>
    apiGet<SecMovement[]>(`/api/v1/securities-positions/${positionId}/movements`),
};
