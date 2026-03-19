import { apiGet } from '@/lib/api';
import type { LiquidityMetric } from '../types/liquidityRiskExt';

export const liquidityRiskApi = {
  /** GET /v1/liquidity-risk/{currency} */
  calc: (currency: string) =>
    apiGet<LiquidityMetric>(`/api/v1/liquidity-risk/${currency}`),

  /** GET /v1/liquidity-risk/breaches */
  breaches: (params?: Record<string, unknown>) =>
    apiGet<LiquidityMetric[]>('/api/v1/liquidity-risk/breaches', params),

};
