import { apiGet, apiPost } from '@/lib/api';

export interface LiquidityMetric {
  id: number;
  reportDate: string;
  currency: string;
  lcrRatio: number;
  nsfrRatio: number;
  hqlaLevel1: number;
  hqlaLevel2A: number;
  hqlaLevel2B: number;
  totalHqla: number;
  totalNetCashOutflows: number;
  availableStableFunding: number;
  requiredStableFunding: number;
  lcrBreached: boolean;
  nsfrBreached: boolean;
  stressScenario?: string;
  stressedLcr?: number;
  createdAt: string;
}

export interface LiquidityStats {
  currentLcr: number;
  currentNsfr: number;
  lcrTrend: { date: string; value: number }[];
  nsfrTrend: { date: string; value: number }[];
  hqlaComposition: { level: string; amount: number }[];
  breachCount: number;
}

export const liquidityRiskApi = {
  // Backend: GET /v1/liquidity-risk (paginated)
  list: (params?: { page?: number; size?: number }) =>
    apiGet<LiquidityMetric[]>('/api/v1/liquidity-risk', params as Record<string, unknown>),

  // Backend: GET /v1/liquidity-risk/{currency}
  getByCurrency: (currency: string) =>
    apiGet<LiquidityMetric[]>(`/api/v1/liquidity-risk/${currency}`),

  // Backend: GET /v1/liquidity-risk/breaches
  getBreaches: () =>
    apiGet<LiquidityMetric[]>('/api/v1/liquidity-risk/breaches'),

  // Backend: GET /v1/liquidity-risk/stats
  getStats: () =>
    apiGet<LiquidityStats>('/api/v1/liquidity-risk/stats'),

  // Backend: POST /v1/liquidity-risk with @RequestBody LiquidityMetric
  calculate: (data: Partial<LiquidityMetric>) =>
    apiPost<LiquidityMetric>('/api/v1/liquidity-risk', data),
};
