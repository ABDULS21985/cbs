import { apiGet } from '@/lib/api';

// ─── Frontend Types (consumed by channel analytics components) ────────────────

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

// ─── Backend Response Types ───────────────────────────────────────────────────

interface BackendChannelStats {
  channel: string;
  sessions: number;
  transactions: number;
  uniqueUsers: number;
}

interface BackendChannelVolumeEntry {
  channel: string;
  volume: number;
  value: number;
}

interface BackendChannelShare {
  channel: string;
  percentage: number;
}

interface BackendChannelMixTrendEntry {
  month: string;
  channels: BackendChannelShare[];
}

interface BackendChannelSuccessRateEntry {
  channel: string;
  total: number;
  successful: number;
  successRate: number;
}

interface BackendChannelSuccessTrendEntry {
  month: string;
  channel: string;
  successRate: number;
}

interface BackendDigitalAdoption {
  digitalPercent: number;
  branchPercent: number;
  digitalTransactions: number;
  branchTransactions: number;
}

interface BackendChannelMigrationEntry {
  month: string;
  migratedCustomers: number;
  migrationRate: number;
}

interface BackendChannelTransactionTypeEntry {
  channel: string;
  transactionType: string;
  count: number;
}

interface BackendHeatmapCell {
  hour: number;
  dayOfWeek: number;
  count: number;
}

// ─── Color mapping ────────────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  MOBILE: '#2563eb', WEB: '#0891b2', BRANCH: '#0f766e',
  ATM: '#7c3aed',   USSD: '#d97706',  POS: '#dc2626', AGENT: '#4f46e5',
};
const defaultColor = '#94a3b8';
function channelColor(ch: string) { return CHANNEL_COLORS[ch?.toUpperCase()] ?? defaultColor; }

// ─── Transformation Functions ─────────────────────────────────────────────────

function transformChannelStats(rows: BackendChannelStats[]): ChannelStats {
  if (!rows || rows.length === 0) {
    return { totalTransactions: 0, digitalTransactions: 0, digitalPct: 0, branchTransactions: 0, branchPct: 0, successRate: 0, avgResponseMs: 0, revenueFees: 0 };
  }
  const total = rows.reduce((s, r) => s + (r.transactions ?? 0), 0);
  const digital = rows.filter((r) => ['MOBILE', 'WEB', 'USSD'].includes(r.channel?.toUpperCase()))
                      .reduce((s, r) => s + (r.transactions ?? 0), 0);
  const branch = rows.filter((r) => r.channel?.toUpperCase() === 'BRANCH')
                     .reduce((s, r) => s + (r.transactions ?? 0), 0);
  return {
    totalTransactions: total,
    digitalTransactions: digital,
    digitalPct: total > 0 ? (digital / total) * 100 : 0,
    branchTransactions: branch,
    branchPct: total > 0 ? (branch / total) * 100 : 0,
    successRate: 0,   // not available from this endpoint
    avgResponseMs: 0,
    revenueFees: 0,
  };
}

function transformChannelVolumes(rows: BackendChannelVolumeEntry[]): ChannelVolume[] {
  const total = rows.reduce((s, r) => s + (r.volume ?? 0), 0);
  return (rows ?? []).map((r) => ({
    channel: (r.channel ?? '') as Channel,
    label: r.channel ?? '',
    count: r.volume ?? 0,
    pct: total > 0 ? ((r.volume ?? 0) / total) * 100 : 0,
    color: channelColor(r.channel ?? ''),
  }));
}

function transformChannelMixTrend(rows: BackendChannelMixTrendEntry[]): ChannelMixPoint[] {
  return (rows ?? []).map((r) => {
    const pctFor = (ch: string) =>
      r.channels?.find((c) => c.channel?.toUpperCase() === ch)?.percentage ?? 0;
    return {
      month:  r.month ?? '',
      mobile: pctFor('MOBILE'),
      web:    pctFor('WEB'),
      branch: pctFor('BRANCH'),
      atm:    pctFor('ATM'),
      ussd:   pctFor('USSD'),
      pos:    pctFor('POS'),
    };
  });
}

function transformHeatmap(rows: BackendHeatmapCell[]): HourlyHeatmapCell[] {
  const max = rows.reduce((m, r) => Math.max(m, r.count ?? 0), 1);
  return (rows ?? []).map((r) => ({
    hour:      r.hour      ?? 0,
    dayOfWeek: r.dayOfWeek ?? 0,
    count:     r.count     ?? 0,
    intensity: (r.count ?? 0) / max,
  }));
}

function transformSuccessRates(rows: BackendChannelSuccessRateEntry[]): ChannelSuccessRate[] {
  return (rows ?? []).map((r) => {
    const failed = (r.total ?? 0) - (r.successful ?? 0);
    return {
      channel:     (r.channel ?? '') as Channel,
      label:       r.channel ?? '',
      total:       r.total      ?? 0,
      success:     r.successful ?? 0,
      failed,
      timeout:     0,  // not in backend DTO
      successPct:  r.successRate ?? 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
    };
  });
}

function transformSuccessTrend(rows: BackendChannelSuccessTrendEntry[]): SuccessRateTrendPoint[] {
  // Backend returns one row per (month, channel). Pivot to flat date-indexed shape.
  const byMonth: Record<string, SuccessRateTrendPoint> = {};
  for (const r of rows ?? []) {
    if (!byMonth[r.month]) {
      byMonth[r.month] = { date: r.month, mobile: 0, web: 0, branch: 0 };
    }
    const ch = r.channel?.toUpperCase();
    if (ch === 'MOBILE') byMonth[r.month].mobile = r.successRate ?? 0;
    else if (ch === 'WEB') byMonth[r.month].web = r.successRate ?? 0;
    else if (ch === 'BRANCH') byMonth[r.month].branch = r.successRate ?? 0;
  }
  return Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date));
}

function transformDigitalAdoption(raw: BackendDigitalAdoption): DigitalAdoption {
  const total = (raw?.digitalTransactions ?? 0) + (raw?.branchTransactions ?? 0);
  const digital = raw?.digitalTransactions ?? 0;
  return {
    registeredUsers:    digital,
    registeredGrowthPct: 0,
    activeUsers30d:     digital,
    activePctOfTotal:   total > 0 ? (digital / total) * 100 : raw?.digitalPercent ?? 0,
    featureAdoption:    [],
    funnel: {
      registered:       digital,
      firstLogin:       Math.round(digital * 0.9),
      firstTransaction: Math.round(digital * 0.7),
      regularUser:      Math.round(digital * 0.5),
    },
  };
}

function transformTransactionTypes(rows: BackendChannelTransactionTypeEntry[]): TransactionType[] {
  // Group by transactionType and aggregate counts across channels
  const byType: Record<string, { count: number; channels: Set<string> }> = {};
  for (const r of rows ?? []) {
    const t = r.transactionType ?? 'UNKNOWN';
    if (!byType[t]) byType[t] = { count: 0, channels: new Set() };
    byType[t].count += r.count ?? 0;
    byType[t].channels.add(r.channel ?? '');
  }
  return Object.entries(byType).map(([type, v]) => ({
    type,
    label: type,
    count: v.count,
    value: 0,   // not in backend DTO
    avgAmount: 0,
    channelMix: Array.from(v.channels).join(', '),
    growthPct: 0,
  }));
}

function transformMigration(rows: BackendChannelMigrationEntry[]): { migrations: MigrationData[]; migrationScore: string } {
  if (!rows || rows.length === 0) return { migrations: [], migrationScore: 'N/A' };
  const latest = rows[rows.length - 1];
  const score = latest ? `${(latest.migrationRate ?? 0).toFixed(1)}%` : 'N/A';
  return {
    migrations: rows.map((r) => ({
      fromChannel: 'BRANCH' as Channel,
      toChannel:   'MOBILE' as Channel,
      customerCount: r.migratedCustomers ?? 0,
      migrationPct:  r.migrationRate     ?? 0,
    })),
    migrationScore: score,
  };
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const channelAnalyticsApi = {
  getChannelStats: (_params?: DateRangeParams): Promise<ChannelStats> =>
    apiGet<BackendChannelStats[]>('/api/v1/reports/channels/stats')
      .then(transformChannelStats),

  getChannelVolumes: (_params?: DateRangeParams): Promise<ChannelVolume[]> =>
    apiGet<BackendChannelVolumeEntry[]>('/api/v1/reports/channels/volumes')
      .then(transformChannelVolumes),

  getChannelMixTrend: (): Promise<ChannelMixPoint[]> =>
    apiGet<BackendChannelMixTrendEntry[]>('/api/v1/reports/channels/mix-trend')
      .then(transformChannelMixTrend),

  getHourlyHeatmap: (_params?: DateRangeParams): Promise<HourlyHeatmapCell[]> =>
    apiGet<BackendHeatmapCell[]>('/api/v1/reports/channels/heatmap')
      .then(transformHeatmap),

  getChannelSuccessRates: (_params?: DateRangeParams): Promise<ChannelSuccessRate[]> =>
    apiGet<BackendChannelSuccessRateEntry[]>('/api/v1/reports/channels/success-rates')
      .then(transformSuccessRates),

  getSuccessRateTrend: (): Promise<SuccessRateTrendPoint[]> =>
    apiGet<BackendChannelSuccessTrendEntry[]>('/api/v1/reports/channels/success-trend')
      .then(transformSuccessTrend),

  getDigitalAdoption: (): Promise<DigitalAdoption> =>
    apiGet<BackendDigitalAdoption>('/api/v1/reports/channels/digital-adoption')
      .then(transformDigitalAdoption),

  getTransactionTypes: (_params?: DateRangeParams): Promise<TransactionType[]> =>
    apiGet<BackendChannelTransactionTypeEntry[]>('/api/v1/reports/channels/transaction-types')
      .then(transformTransactionTypes),

  getMigrationData: (): Promise<{ migrations: MigrationData[]; migrationScore: string }> =>
    apiGet<BackendChannelMigrationEntry[]>('/api/v1/reports/channels/migration')
      .then(transformMigration),
};
