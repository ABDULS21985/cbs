import { apiGet, apiPost } from '@/lib/api';

/** Matches com.cbs.marketrisk.entity.MarketRiskPosition field names exactly */
export interface MarketRiskPosition {
  id: number;
  positionDate: string;        // entity: LocalDate positionDate
  riskType: string;
  portfolio: string;
  currency: string;
  var1d95: number;             // 1-day 95% historical VaR
  var1d99: number;             // 1-day 99% parametric VaR
  var10d99: number;            // 10-day 99% VaR
  varMethod: string;
  stressLossModerate: number;
  stressLossSevere: number;
  stressScenario?: string;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
  varLimit: number;
  varUtilizationPct: number;   // entity: varUtilizationPct
  limitBreach: boolean;        // entity: limitBreach
  dailyPnl: number;
  mtdPnl: number;
  ytdPnl: number;
  createdAt: string;
}

export interface MarketRiskStats {
  totalVar: number;
  avgLimitUtilization: number;
  breachCount: number;
  portfolioStressLoss: number;
}

export const marketRiskApi = {
  // Backend: GET /v1/market-risk (paginated)
  list: (params?: { page?: number; size?: number }) =>
    apiGet<MarketRiskPosition[]>('/api/v1/market-risk', params as Record<string, unknown>),

  // Backend: GET /v1/market-risk/{date}
  getByDate: (date: string) =>
    apiGet<MarketRiskPosition[]>(`/api/v1/market-risk/${date}`),

  // Backend: GET /v1/market-risk/breaches
  getBreaches: () =>
    apiGet<MarketRiskPosition[]>('/api/v1/market-risk/breaches'),

  // Backend: GET /v1/market-risk/stats
  getStats: () =>
    apiGet<MarketRiskStats>('/api/v1/market-risk/stats'),

  // Backend: POST /v1/market-risk with @RequestBody MarketRiskPosition
  record: (data: Partial<MarketRiskPosition>) =>
    apiPost<MarketRiskPosition>('/api/v1/market-risk', data),
};
