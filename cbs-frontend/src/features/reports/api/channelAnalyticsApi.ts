import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Channel = 'MOBILE' | 'WEB' | 'BRANCH' | 'ATM' | 'USSD' | 'POS' | 'AGENT';

export interface ChannelStats {
  totalTransactions: number;
  digitalTransactions: number;
  digitalPct: number;
  branchTransactions: number;
  branchPct: number;
  successRate: number;
  avgResponseMs: number;
  revenueFees: number;
}

export interface ChannelVolume {
  channel: Channel;
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface ChannelMixPoint {
  month: string;
  mobile: number;
  web: number;
  branch: number;
  atm: number;
  ussd: number;
  pos: number;
}

export interface HourlyHeatmapCell {
  hour: number;
  dayOfWeek: number;
  count: number;
  intensity: number;
}

export interface ChannelSuccessRate {
  channel: Channel;
  label: string;
  total: number;
  success: number;
  failed: number;
  timeout: number;
  successPct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface SuccessRateTrendPoint {
  date: string;
  mobile: number;
  web: number;
  branch: number;
}

export interface DigitalAdoption {
  registeredUsers: number;
  registeredGrowthPct: number;
  activeUsers30d: number;
  activePctOfTotal: number;
  featureAdoption: { feature: string; pct: number }[];
  funnel: {
    registered: number;
    firstLogin: number;
    firstTransaction: number;
    regularUser: number;
  };
}

export interface TransactionType {
  type: string;
  label: string;
  count: number;
  value: number;
  avgAmount: number;
  channelMix: string;
  growthPct: number;
}

export interface MigrationData {
  fromChannel: Channel;
  toChannel: Channel;
  customerCount: number;
  migrationPct: number;
}

export interface DateRangeParams {
  dateFrom: string;
  dateTo: string;
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const channelAnalyticsApi = {
  getChannelStats: (_params?: DateRangeParams): Promise<ChannelStats> =>
    apiGet<ChannelStats>('/api/v1/reports/channels/stats'),

  getChannelVolumes: (_params?: DateRangeParams): Promise<ChannelVolume[]> =>
    apiGet<ChannelVolume[]>('/api/v1/reports/channels/volumes'),

  getChannelMixTrend: (): Promise<ChannelMixPoint[]> =>
    apiGet<ChannelMixPoint[]>('/api/v1/reports/channels/mix-trend'),

  getHourlyHeatmap: (_params?: DateRangeParams): Promise<HourlyHeatmapCell[]> =>
    apiGet<HourlyHeatmapCell[]>('/api/v1/reports/channels/heatmap'),

  getChannelSuccessRates: (_params?: DateRangeParams): Promise<ChannelSuccessRate[]> =>
    apiGet<ChannelSuccessRate[]>('/api/v1/reports/channels/success-rates'),

  getSuccessRateTrend: (): Promise<SuccessRateTrendPoint[]> =>
    apiGet<SuccessRateTrendPoint[]>('/api/v1/reports/channels/success-trend'),

  getDigitalAdoption: (): Promise<DigitalAdoption> =>
    apiGet<DigitalAdoption>('/api/v1/reports/channels/digital-adoption'),

  getTransactionTypes: (_params?: DateRangeParams): Promise<TransactionType[]> =>
    apiGet<TransactionType[]>('/api/v1/reports/channels/transaction-types'),

  getMigrationData: (): Promise<{ migrations: MigrationData[]; migrationScore: string }> =>
    apiGet('/api/v1/reports/channels/migration'),
};
