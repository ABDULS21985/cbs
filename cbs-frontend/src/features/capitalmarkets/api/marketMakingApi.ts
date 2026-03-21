import { apiGet, apiPost } from '@/lib/api';
import type { MarketMakingMandate, MarketMakingActivity } from '../types/marketMaking';

export const marketMakingApi = {
  /** POST /v1/market-making — create mandate */
  createMandate: (data: Partial<MarketMakingMandate>) =>
    apiPost<MarketMakingMandate>('/api/v1/market-making', data),

  /** POST /v1/market-making/{code}/activity — record daily activity */
  recordActivity: (code: string, data: Partial<MarketMakingActivity>) =>
    apiPost<MarketMakingActivity>(`/api/v1/market-making/${code}/activity`, data),

  /** GET /v1/market-making/active */
  getActiveMandates: () =>
    apiGet<MarketMakingMandate[]>('/api/v1/market-making/active'),

  /** GET /v1/market-making/{code}/performance */
  getPerformance: (code: string) =>
    apiGet<MarketMakingActivity[]>(`/api/v1/market-making/${code}/performance`),

  /** GET /v1/market-making/obligation-compliance */
  getObligationCompliance: () =>
    apiGet<MarketMakingActivity[]>('/api/v1/market-making/obligation-compliance'),

  /** POST /v1/market-making/{code}/suspend */
  suspendMandate: (code: string) =>
    apiPost<MarketMakingMandate>(`/api/v1/market-making/${code}/suspend`),
};
