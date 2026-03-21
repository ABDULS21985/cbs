import { apiGet, apiPost } from '@/lib/api';

export interface MarketRiskPosition {
  id: number;
  reportDate: string;
  deskId: number;
  deskName: string;
  currency: string;
  varHistorical: number;
  varParametric: number;
  varMonteCarlo: number;
  stressLoss: number;
  greeksDelta: number;
  greeksGamma: number;
  greeksVega: number;
  greeksTheta: number;
  pnlAttribution: number;
  limitUtilization: number;
  breached: boolean;
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
