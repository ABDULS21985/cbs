import { apiGet, apiPost } from '@/lib/api';
import type { MarketDataFeed, MarketPrice, MarketSignal } from '../types/marketDataExt';

export const marketDataApi = {
  /** GET /v1/market-data/feeds */
  listFeeds: (params?: Record<string, unknown>) =>
    apiGet<MarketDataFeed[]>('/api/v1/market-data/feeds', params),

  /** GET /v1/market-data/prices */
  listPrices: (params?: Record<string, unknown>) =>
    apiGet<MarketPrice[]>('/api/v1/market-data/prices', params),

  /** POST /v1/market-data/signals */
  recordSignal: (data: Partial<MarketSignal>) =>
    apiPost<MarketSignal>('/api/v1/market-data/signals', data),

  /** GET /v1/market-data/research */
  recordSignal2: (params?: Record<string, unknown>) =>
    apiGet<MarketSignal>('/api/v1/market-data/research', params),

};
