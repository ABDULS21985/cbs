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

// ─── Backend entity shape for MarketDataSwitch (from JPA) ───────────────────

interface BackendMarketDataSwitch {
  id: number;
  switchName: string;
  switchType: string;
  inputFeeds: Record<string, unknown>;
  outputSubscribers: Record<string, unknown>;
  transformationRules: Record<string, unknown>;
  filterRules: Record<string, unknown>;
  validationRules: Record<string, unknown>;
  throughputPerSecond: number;
  latencyMs: number;
  lastProcessedAt: string;
  totalProcessedToday: number;
  totalRejectedToday: number;
  totalErrorsToday: number;
  status: string;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

/** Derive a SwitchDashboard summary from a list of backend MarketDataSwitch entities. */
function deriveSwitchDashboard(switches: BackendMarketDataSwitch[]): SwitchDashboard {
  const totalFeeds = switches.length;
  const activeFeeds = switches.filter(s => s.status === 'RUNNING' || s.status === 'ACTIVE').length;
  const messagesPerSec = switches.reduce((sum, s) => sum + (s.throughputPerSecond ?? 0), 0);
  const totalProcessed = switches.reduce((sum, s) => sum + (s.totalProcessedToday ?? 0), 0);
  const totalErrors = switches.reduce((sum, s) => sum + (s.totalErrorsToday ?? 0), 0);
  const errorRate = totalProcessed > 0 ? (totalErrors / totalProcessed) * 100 : 0;
  const uptimePct = totalFeeds > 0 ? (activeFeeds / totalFeeds) * 100 : 0;
  const latest = switches.reduce<string | undefined>(
    (max, s) => (!max || (s.lastProcessedAt && s.lastProcessedAt > max) ? s.lastProcessedAt : max),
    undefined,
  );
  return { totalFeeds, activeFeeds, messagesPerSec, errorRate, uptimePct, lastUpdated: latest };
}

/** Map backend MarketDataSwitch entity → frontend MarketDataSwitch. */
function mapSwitch(raw: BackendMarketDataSwitch): MarketDataSwitch {
  return {
    id: String(raw.id),
    name: raw.switchName,
    type: raw.switchType,
    status: raw.status === 'RUNNING' || raw.status === 'ACTIVE' ? 'RUNNING' : 'STOPPED',
    createdAt: raw.lastProcessedAt ?? '',
  };
}

/** Map backend MarketDataSubscription entity → frontend SubscriptionHealth. */
function mapSubscriptionHealth(raw: MarketDataSubscription): SubscriptionHealth {
  const feedIdKeys = raw.feedIds ? Object.keys(raw.feedIds) : [];
  const instrumentKeys = raw.instrumentFilter ? Object.keys(raw.instrumentFilter) : [];
  const isHealthy = raw.isActive && raw.deliveryFailureCount === 0;
  const isDegraded = raw.isActive && raw.deliveryFailureCount > 0;
  return {
    subscriptionId: String(raw.id),
    switchId: '',
    provider: raw.subscriberSystem ?? '',
    instrument: instrumentKeys.join(', ') || feedIdKeys.join(', '),
    priority: 0,
    status: isHealthy ? 'HEALTHY' : isDegraded ? 'DEGRADED' : 'FAILED',
    latencyMs: 0,
    lastHeartbeatAt: raw.lastDeliveredAt ?? '',
  };
}

// ─── Market Data Switch ──────────────────────────────────────────────────────

/**
 * The backend GET /dashboard returns List<MarketDataSwitch>, NOT a summary object.
 * We derive the SwitchDashboard from the list.
 */
export const getSwitchDashboard = async (): Promise<SwitchDashboard> => {
  const raw = await apiGet<BackendMarketDataSwitch[]>('/api/v1/market-data-switch/dashboard');
  return deriveSwitchDashboard(raw);
};

/**
 * The backend GET /subscriptions/health returns List<MarketDataSubscription>,
 * not SubscriptionHealth objects. Map them.
 */
export const getSubscriptionHealth = async (): Promise<SubscriptionHealth[]> => {
  const raw = await apiGet<MarketDataSubscription[]>('/api/v1/market-data-switch/subscriptions/health');
  return raw.map(mapSubscriptionHealth);
};

export const listSubscriptions = (params?: Record<string, unknown>) =>
  apiGet<MarketDataSubscription[]>('/api/v1/market-data-switch/subscriptions', params);

export const registerSwitch = async (input: { name: string; type: string }): Promise<MarketDataSwitch> => {
  const raw = await apiPost<BackendMarketDataSwitch>('/api/v1/market-data-switch', input);
  return mapSwitch(raw);
};

export const startSwitch = async (id: string): Promise<MarketDataSwitch> => {
  const raw = await apiPost<BackendMarketDataSwitch>(`/api/v1/market-data-switch/${id}/start`);
  return mapSwitch(raw);
};

export const stopSwitch = async (id: string): Promise<MarketDataSwitch> => {
  const raw = await apiPost<BackendMarketDataSwitch>(`/api/v1/market-data-switch/${id}/stop`);
  return mapSwitch(raw);
};

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

/** POST /api/v1/market-making — create a new mandate. */
export const createMandate = (data: Partial<MarketMakingMandate>) =>
  apiPost<MarketMakingMandate>('/api/v1/market-making', data);

/** GET /api/v1/market-making/active — list active mandates. */
export const getActiveMandates = () =>
  apiGet<MarketMakingMandate[]>('/api/v1/market-making/active');

/** GET /api/v1/market-making/{code}/performance — performance data for a mandate. */
export const getMandatePerformance = (code: string) =>
  apiGet<MarketMakingActivity[]>(`/api/v1/market-making/${code}/performance`);

/** GET /api/v1/market-making/obligation-compliance — compliance status for all mandates. */
export const getObligationCompliance = () =>
  apiGet<MarketMakingMandate[]>('/api/v1/market-making/obligation-compliance');
