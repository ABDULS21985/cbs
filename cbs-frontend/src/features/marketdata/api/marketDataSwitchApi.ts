import { apiGet } from '@/lib/api';
import type { MarketDataSubscription } from '../types/marketDataSwitch';

export const marketDataSwitchApi = {
  /** GET /v1/market-data-switch/subscriptions */
  listSubscriptions: (params?: Record<string, unknown>) =>
    apiGet<MarketDataSubscription[]>('/api/v1/market-data-switch/subscriptions', params),

};
