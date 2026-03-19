import { apiGet } from '@/lib/api';
import type { MarketRiskPosition } from '../types/marketRiskExt';

export const marketRiskApi = {
  /** GET /v1/market-risk/{date} */
  record: (date: string) =>
    apiGet<MarketRiskPosition>(`/api/v1/market-risk/${date}`),

  /** GET /v1/market-risk/breaches */
  breaches: (params?: Record<string, unknown>) =>
    apiGet<MarketRiskPosition[]>('/api/v1/market-risk/breaches', params),

};
