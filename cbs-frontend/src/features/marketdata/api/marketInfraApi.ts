/**
 * API for market data switch, subscriptions, and market making.
 */
import { apiGet, apiPost } from '@/lib/api';
import type {
  SwitchDashboard,
  SubscriptionHealth,
  MarketDataSwitch,
} from '../types';
import type { MarketDataSubscription } from '../types/marketDataSwitch';
import type { MarketMakingActivity, MarketMakingMandate } from '../types/marketMaking';

// ─── Market Data Switch ──────────────────────────────────────────────────────

export const getSwitchDashboard = () =>
  apiGet<SwitchDashboard>('/api/v1/market-data-switch/dashboard');

export const getSubscriptionHealth = () =>
  apiGet<SubscriptionHealth[]>('/api/v1/market-data-switch/subscriptions/health');

export const listSubscriptions = (params?: Record<string, unknown>) =>
  apiGet<MarketDataSubscription[]>('/api/v1/market-data-switch/subscriptions', params);

export const registerSwitch = (input: { name: string; type: string }) =>
  apiPost<MarketDataSwitch>('/api/v1/market-data-switch', input);

export const startSwitch = (id: string) =>
  apiPost<MarketDataSwitch>(`/api/v1/market-data-switch/${id}/start`);

export const stopSwitch = (id: string) =>
  apiPost<MarketDataSwitch>(`/api/v1/market-data-switch/${id}/stop`);

export const addSubscription = (input: {
  switchId: string;
  provider: string;
  instrument: string;
  priority: number;
}) => apiPost<SubscriptionHealth>('/api/v1/market-data-switch/subscriptions', input);

// ─── Market Making ───────────────────────────────────────────────────────────

export const recordDailyActivity = (code: string, data: Partial<MarketMakingActivity>) =>
  apiPost<MarketMakingActivity>(`/api/v1/market-making/${code}/activity`, data);

export const suspendMandate = (code: string) =>
  apiPost<MarketMakingMandate>(`/api/v1/market-making/${code}/suspend`);
