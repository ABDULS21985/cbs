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
  status: string;
  lastProcessedAt: string;
}

/** Backend SwitchDashboardDto returned by GET /v1/market-data-switch/dashboard. */
interface SwitchDashboardDto {
  totalFeeds: number;
  activeFeeds: number;
  messagesPerSec: number;
  errorRate: number;
  uptimePct: number;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

/** Map backend SwitchDashboardDto → frontend SwitchDashboard. */
function mapSwitchDashboard(dto: SwitchDashboardDto): SwitchDashboard {
  return {
    totalFeeds: dto.totalFeeds,
    activeFeeds: dto.activeFeeds,
    messagesPerSec: dto.messagesPerSec,
    errorRate: Number(dto.errorRate) || 0,
    uptimePct: Number(dto.uptimePct) || 0,
  };
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
 * GET /dashboard returns a SwitchDashboardDto (single aggregated object).
 */
export const getSwitchDashboard = async (): Promise<SwitchDashboard> => {
  const dto = await apiGet<SwitchDashboardDto>('/api/v1/market-data-switch/dashboard');
  return mapSwitchDashboard(dto);
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
  const raw = await apiPost<BackendMarketDataSwitch>('/api/v1/market-data-switch', {
    switchName: input.name,
    switchType: input.type,
  });
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

/** GET /api/v1/market-making/obligation-compliance — daily activity compliance records. */
export const getObligationCompliance = () =>
  apiGet<MarketMakingActivity[]>('/api/v1/market-making/obligation-compliance');
