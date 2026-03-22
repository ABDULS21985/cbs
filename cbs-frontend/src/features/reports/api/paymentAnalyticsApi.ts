import { apiGet } from '@/lib/api';

// ─── Frontend Types (consumed by payment analytics components) ────────────────

export interface DateRangeParams {
  dateFrom: string;
  dateTo: string;
}

export interface PaymentStats {
  totalVolume: number;
  transactionCount: number;
  successRate: number;
  avgProcessingSeconds: number;
  failedVolume: number;
  vsLastPeriod: {
    volume: number;
    count: number;
    successRate: number;
  };
}

export interface VolumeTrendPoint {
  period: string;
  transactionCount: number;
  totalValue: number;
}

export interface ChannelBreakdown {
  channel: string;
  volume: number;
  value: number;
  successRate: number;
  color: string;
}

export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FailedTransaction {
  id: string;
  reference: string;
  amount: number;
  reason: string;
  date: string;
  retryStatus: string;
}

export interface RailUtilization {
  rail: string;
  volume: number;
  value: number;
  avgLatencyMs: number;
  successRate: number;
  costPerTxn: number;
}

export interface ReconciliationRow {
  rail: string;
  expected: number;
  matched: number;
  unmatched: number;
  breaks: number;
  status: 'RECONCILED' | 'BREAKS_MINOR' | 'BREAKS_MAJOR';
}

// ─── Backend Response Types ────────────────────────────────────────────────────

interface BackendPaymentStats {
  totalVolume: number;
  totalValue: number;
  successRate: number;
  avgTransaction: number;
}

interface BackendVolumeTrendEntry {
  month: string;
  volume: number;
  value: number;
}

interface BackendChannelBreakdownEntry {
  channel: string;
  volume: number;
  value: number;
  percentage: number;
}

interface BackendPaymentRailEntry {
  rail: string;
  volume: number;
  value: number;
  percentage: number;
}

interface BackendPaymentFailureEntry {
  reason: string;
  count: number;
  percentage: number;
}

interface BackendReconciliationSummary {
  totalTransactions: number;
  matched: number;
  unmatched: number;
  matchRate: number;
}

// ─── Color mapping ─────────────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  MOBILE: '#2563eb', WEB: '#0891b2', BRANCH: '#0f766e',
  ATM: '#7c3aed',   USSD: '#d97706',  POS: '#dc2626', AGENT: '#4f46e5',
};
const FAILURE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#0891b2', '#7c3aed'];
function channelColor(ch: string) { return CHANNEL_COLORS[ch?.toUpperCase()] ?? '#94a3b8'; }
function failureColor(i: number) { return FAILURE_COLORS[i % FAILURE_COLORS.length]; }

// ─── Transformation Functions ──────────────────────────────────────────────────

function transformPaymentStats(raw: BackendPaymentStats): PaymentStats {
  return {
    totalVolume:          raw?.totalVolume   ?? 0,
    transactionCount:     raw?.totalVolume   ?? 0,  // backend uses same field for volume/count
    successRate:          raw?.successRate   ?? 0,
    avgProcessingSeconds: (raw?.avgTransaction ?? 0) / 1000,  // backend is ms
    failedVolume:         0,                  // not in backend DTO
    vsLastPeriod:         { volume: 0, count: 0, successRate: 0 },
  };
}

function transformVolumeTrend(entries: BackendVolumeTrendEntry[]): VolumeTrendPoint[] {
  return (entries ?? []).map((e) => ({
    period:           e.month  ?? '',
    transactionCount: e.volume ?? 0,
    totalValue:       e.value  ?? 0,
  }));
}

function transformChannelBreakdown(entries: BackendChannelBreakdownEntry[]): ChannelBreakdown[] {
  return (entries ?? []).map((e) => ({
    channel:     e.channel ?? '',
    volume:      e.volume  ?? 0,
    value:       e.value   ?? 0,
    successRate: 0,                        // not in backend DTO
    color:       channelColor(e.channel ?? ''),
  }));
}

function transformFailureAnalysis(
  entries: BackendPaymentFailureEntry[],
): { reasons: FailureReason[]; topFailed: FailedTransaction[] } {
  const reasons = (entries ?? []).map((e, i) => ({
    reason:     e.reason     ?? '',
    count:      e.count      ?? 0,
    percentage: e.percentage ?? 0,
    color:      failureColor(i),
  }));
  return { reasons, topFailed: [] };  // topFailed not in backend DTO
}

function transformRailsUtilization(entries: BackendPaymentRailEntry[]): RailUtilization[] {
  return (entries ?? []).map((e) => ({
    rail:         e.rail   ?? '',
    volume:       e.volume ?? 0,
    value:        e.value  ?? 0,
    avgLatencyMs: 0,   // not in backend DTO
    successRate:  0,
    costPerTxn:   0,
  }));
}

function transformReconciliationSummary(raw: BackendReconciliationSummary): ReconciliationRow[] {
  if (!raw) return [];
  const unmatched = raw.unmatched ?? 0;
  const status: ReconciliationRow['status'] =
    unmatched === 0   ? 'RECONCILED'   :
    unmatched < 10    ? 'BREAKS_MINOR' : 'BREAKS_MAJOR';
  return [{
    rail:      'ALL',
    expected:  raw.totalTransactions ?? 0,
    matched:   raw.matched           ?? 0,
    unmatched,
    breaks:    unmatched,
    status,
  }];
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const paymentAnalyticsApi = {
  getStats: (params: DateRangeParams): Promise<PaymentStats> =>
    apiGet<BackendPaymentStats>('/api/v1/reports/payments/stats', params as unknown as Record<string, unknown>)
      .then(transformPaymentStats),

  getVolumeTrend: (params: { dateFrom: string; dateTo: string; groupBy: 'day' | 'week' | 'month' }): Promise<VolumeTrendPoint[]> =>
    apiGet<BackendVolumeTrendEntry[]>('/api/v1/reports/payments/volume-trend', params as unknown as Record<string, unknown>)
      .then(transformVolumeTrend),

  getChannelBreakdown: (params: DateRangeParams): Promise<ChannelBreakdown[]> =>
    apiGet<BackendChannelBreakdownEntry[]>('/api/v1/reports/payments/channel-breakdown', params as unknown as Record<string, unknown>)
      .then(transformChannelBreakdown),

  getFailureAnalysis: (params: DateRangeParams): Promise<{ reasons: FailureReason[]; topFailed: FailedTransaction[] }> =>
    apiGet<BackendPaymentFailureEntry[]>('/api/v1/reports/payments/failures', params as unknown as Record<string, unknown>)
      .then(transformFailureAnalysis),

  getRailsUtilization: (params: DateRangeParams): Promise<RailUtilization[]> =>
    apiGet<BackendPaymentRailEntry[]>('/api/v1/reports/payments/rails', params as unknown as Record<string, unknown>)
      .then(transformRailsUtilization),

  getReconciliationSummary: (params: DateRangeParams): Promise<ReconciliationRow[]> =>
    apiGet<BackendReconciliationSummary>('/api/v1/reports/payments/reconciliation', params as unknown as Record<string, unknown>)
      .then(transformReconciliationSummary),
};
