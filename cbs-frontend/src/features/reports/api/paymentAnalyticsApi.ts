import { apiGet } from '@/lib/api';
import { format, subDays, subMonths } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Mock Data Generators ─────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  Mobile: '#3b82f6',
  Web: '#8b5cf6',
  Branch: '#f59e0b',
  ATM: '#10b981',
  USSD: '#ef4444',
  POS: '#06b6d4',
  Agent: '#f97316',
};

const FAILURE_COLORS: Record<string, string> = {
  'Insufficient Funds': '#ef4444',
  Timeout: '#f97316',
  'Invalid Account': '#f59e0b',
  'System Error': '#8b5cf6',
  'Limit Exceeded': '#3b82f6',
  Other: '#6b7280',
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateMockStats(_params: DateRangeParams): PaymentStats {
  return {
    totalVolume: 48_320_000_000,
    transactionCount: 284_750,
    successRate: 98.72,
    avgProcessingSeconds: 2.4,
    failedVolume: 612_400_000,
    vsLastPeriod: {
      volume: 12.4,
      count: 8.7,
      successRate: 0.3,
    },
  };
}

function generateMockVolumeTrend(params: { dateFrom: string; dateTo: string; groupBy: 'day' | 'week' | 'month' }): VolumeTrendPoint[] {
  const points: VolumeTrendPoint[] = [];
  const count = params.groupBy === 'day' ? 30 : params.groupBy === 'week' ? 12 : 6;
  for (let i = 0; i < count; i++) {
    const seed = i + 42;
    const base = 8500 + Math.floor(seededRandom(seed) * 3500);
    const valueBase = 1_400_000_000 + Math.floor(seededRandom(seed + 100) * 800_000_000);
    let period: string;
    if (params.groupBy === 'day') {
      const d = subDays(new Date(), count - 1 - i);
      period = format(d, 'dd MMM');
    } else if (params.groupBy === 'week') {
      period = `W${count - i}`;
    } else {
      const d = subMonths(new Date(), count - 1 - i);
      period = format(d, 'MMM yyyy');
    }
    points.push({ period, transactionCount: base, totalValue: valueBase });
  }
  return points;
}

function generateMockChannelBreakdown(_params: DateRangeParams): ChannelBreakdown[] {
  const channels = [
    { channel: 'Mobile', volume: 98420, value: 18_200_000_000, successRate: 99.1 },
    { channel: 'Web', volume: 62340, value: 12_400_000_000, successRate: 98.8 },
    { channel: 'Branch', volume: 34210, value: 8_600_000_000, successRate: 99.5 },
    { channel: 'ATM', volume: 41800, value: 4_200_000_000, successRate: 97.3 },
    { channel: 'USSD', volume: 28900, value: 2_800_000_000, successRate: 96.4 },
    { channel: 'POS', volume: 14200, value: 1_600_000_000, successRate: 98.2 },
    { channel: 'Agent', volume: 4880, value: 520_000_000, successRate: 99.0 },
  ];
  return channels.map((c) => ({ ...c, color: CHANNEL_COLORS[c.channel] || '#6b7280' }));
}

function generateMockFailureAnalysis(_params: DateRangeParams): { reasons: FailureReason[]; topFailed: FailedTransaction[] } {
  const totalFailed = 3640;
  const reasons: Array<{ reason: string; count: number }> = [
    { reason: 'Insufficient Funds', count: 1456 },
    { reason: 'Timeout', count: 729 },
    { reason: 'Invalid Account', count: 546 },
    { reason: 'System Error', count: 365 },
    { reason: 'Limit Exceeded', count: 364 },
    { reason: 'Other', count: 180 },
  ];
  const failureReasons: FailureReason[] = reasons.map((r) => ({
    ...r,
    percentage: parseFloat(((r.count / totalFailed) * 100).toFixed(1)),
    color: FAILURE_COLORS[r.reason] || '#6b7280',
  }));

  const failReasonList = ['Insufficient Funds', 'Timeout', 'Invalid Account', 'System Error', 'Limit Exceeded'];
  const retryStatuses = ['PENDING_RETRY', 'RETRIED_SUCCESS', 'MAX_RETRIES', 'NOT_RETRIED'];
  const topFailed: FailedTransaction[] = Array.from({ length: 10 }, (_, i) => {
    const seed = i + 500;
    return {
      id: `fail-${i + 1}`,
      reference: `TXN${String(800000 + i * 7 + Math.floor(seededRandom(seed) * 100)).padStart(9, '0')}`,
      amount: 500_000 + Math.floor(seededRandom(seed + 10) * 9_500_000),
      reason: failReasonList[i % failReasonList.length],
      date: format(subDays(new Date(), Math.floor(seededRandom(seed + 20) * 30)), 'yyyy-MM-dd'),
      retryStatus: retryStatuses[i % retryStatuses.length],
    };
  }).sort((a, b) => b.amount - a.amount);

  return { reasons: failureReasons, topFailed };
}

function generateMockRailsUtilization(_params: DateRangeParams): RailUtilization[] {
  return [
    { rail: 'NIP', volume: 142600, value: 22_400_000_000, avgLatencyMs: 1240, successRate: 99.1, costPerTxn: 52.5 },
    { rail: 'NEFT', volume: 48200, value: 12_600_000_000, avgLatencyMs: 3800, successRate: 99.7, costPerTxn: 35.0 },
    { rail: 'RTGS', volume: 3420, value: 8_900_000_000, avgLatencyMs: 520, successRate: 99.9, costPerTxn: 1500.0 },
    { rail: 'Internal', volume: 64800, value: 2_400_000_000, avgLatencyMs: 180, successRate: 99.98, costPerTxn: 0.0 },
    { rail: 'Card (Visa/MC)', volume: 21400, value: 1_420_000_000, avgLatencyMs: 2100, successRate: 97.8, costPerTxn: 120.0 },
    { rail: 'International (SWIFT)', volume: 4330, value: 600_000_000, avgLatencyMs: 8400, successRate: 98.4, costPerTxn: 3500.0 },
  ];
}

function generateMockReconciliation(_params: DateRangeParams): ReconciliationRow[] {
  return [
    { rail: 'NIP', expected: 142600, matched: 142600, unmatched: 0, breaks: 0, status: 'RECONCILED' },
    { rail: 'NEFT', expected: 48200, matched: 48196, unmatched: 4, breaks: 4, status: 'BREAKS_MINOR' },
    { rail: 'RTGS', expected: 3420, matched: 3420, unmatched: 0, breaks: 0, status: 'RECONCILED' },
    { rail: 'Internal', expected: 64800, matched: 64800, unmatched: 0, breaks: 0, status: 'RECONCILED' },
    { rail: 'Card (Visa/MC)', expected: 21400, matched: 21374, unmatched: 26, breaks: 26, status: 'BREAKS_MAJOR' },
    { rail: 'International (SWIFT)', expected: 4330, matched: 4328, unmatched: 2, breaks: 2, status: 'BREAKS_MINOR' },
  ];
}

// ─── API Object ────────────────────────────────────────────────────────────────

const DEMO_MODE = true;

async function withDemo<T>(mockFn: () => T, apiFn: () => Promise<T>): Promise<T> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    return mockFn();
  }
  return apiFn();
}

export const paymentAnalyticsApi = {
  getStats: (params: DateRangeParams): Promise<PaymentStats> =>
    withDemo(
      () => generateMockStats(params),
      () => apiGet<PaymentStats>('/v1/reports/payments/stats', params as unknown as Record<string, unknown>),
    ),

  getVolumeTrend: (params: { dateFrom: string; dateTo: string; groupBy: 'day' | 'week' | 'month' }): Promise<VolumeTrendPoint[]> =>
    withDemo(
      () => generateMockVolumeTrend(params),
      () => apiGet<VolumeTrendPoint[]>('/v1/reports/payments/volume-trend', params as unknown as Record<string, unknown>),
    ),

  getChannelBreakdown: (params: DateRangeParams): Promise<ChannelBreakdown[]> =>
    withDemo(
      () => generateMockChannelBreakdown(params),
      () => apiGet<ChannelBreakdown[]>('/v1/reports/payments/channel-breakdown', params as unknown as Record<string, unknown>),
    ),

  getFailureAnalysis: (params: DateRangeParams): Promise<{ reasons: FailureReason[]; topFailed: FailedTransaction[] }> =>
    withDemo(
      () => generateMockFailureAnalysis(params),
      () => apiGet<{ reasons: FailureReason[]; topFailed: FailedTransaction[] }>('/v1/reports/payments/failures', params as unknown as Record<string, unknown>),
    ),

  getRailsUtilization: (params: DateRangeParams): Promise<RailUtilization[]> =>
    withDemo(
      () => generateMockRailsUtilization(params),
      () => apiGet<RailUtilization[]>('/v1/reports/payments/rails', params as unknown as Record<string, unknown>),
    ),

  getReconciliationSummary: (params: DateRangeParams): Promise<ReconciliationRow[]> =>
    withDemo(
      () => generateMockReconciliation(params),
      () => apiGet<ReconciliationRow[]>('/v1/reports/payments/reconciliation', params as unknown as Record<string, unknown>),
    ),
};
