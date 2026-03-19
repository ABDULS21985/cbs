import { apiPost } from '@/lib/api';
import type { MarketMakingActivity, MarketMakingMandate } from '../types/marketMaking';

export const marketMakingApi = {
  /** POST /v1/market-making/{code}/activity */
  recordDailyActivity: (code: string, data: Partial<MarketMakingActivity>) =>
    apiPost<MarketMakingActivity>(`/api/v1/market-making/${code}/activity`, data),

  /** POST /v1/market-making/{code}/suspend */
  suspendMandate: (code: string) =>
    apiPost<MarketMakingMandate>(`/api/v1/market-making/${code}/suspend`),

};
