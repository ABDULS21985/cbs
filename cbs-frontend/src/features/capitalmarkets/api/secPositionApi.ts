import { apiGet, apiPost } from '@/lib/api';

export type MovementType = 'BUY' | 'SELL' | 'TRANSFER' | 'CORPORATE_ACTION';

export interface SecuritiesPosition {
  id: number;
  positionId: string;
  portfolioCode: string;
  instrumentCode: string;
  instrumentName: string;
  isin: string;
  instrumentType: string;
  currency: string;
  quantity: number;
  avgCost: number;
  costBasis: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  accruedInterest: number;
  lastPricedAt: string;
  positionDate: string;
}

export interface SecuritiesMovement {
  id: number;
  movementRef: string;
  positionId: string;
  movementDate: string;
  instrumentCode: string;
  instrumentName: string;
  movementType: MovementType;
  quantity: number;
  price: number;
  settlementAmount: number;
  currency: string;
  counterpartyCode: string;
  counterpartyName: string;
  portfolioCode: string;
  tradeDate: string;
  settlementDate: string;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';
  createdAt: string;
}

export interface PortfolioPositionSummary {
  portfolioCode: string;
  portfolioName: string;
  totalMarketValue: number;
  currency: string;
  positionCount: number;
  byAssetClass: { assetClass: string; marketValue: number; percentage: number; count: number }[];
  positions: SecuritiesPosition[];
}

export const secPositionApi = {
  // Positions
  getPositions: (params?: { instrumentType?: string; portfolioCode?: string }) =>
    apiGet<SecuritiesPosition[]>('/api/v1/securities-positions', params).catch(() => []),

  // Movements
  getMovements: (params?: { dateFrom?: string; dateTo?: string; type?: string; instrumentCode?: string }) =>
    apiGet<SecuritiesMovement[]>('/api/v1/securities-positions/movements', params).catch(() => []),

  recordMovement: (payload: {
    instrumentCode: string;
    movementType: MovementType;
    quantity: number;
    price: number;
    currency: string;
    counterpartyCode: string;
    portfolioCode: string;
    tradeDate: string;
    settlementDate: string;
  }) => apiPost<SecuritiesMovement>('/api/v1/securities-positions/movements', payload),

  // By portfolio
  getPortfolioPositions: (code: string) =>
    apiGet<PortfolioPositionSummary>(`/api/v1/securities-positions/portfolio/${code}`),

  // Position movements
  getPositionMovements: (positionId: number) =>
    apiGet<SecuritiesMovement[]>(`/api/v1/securities-positions/${positionId}/movements`).catch(() => []),
};
