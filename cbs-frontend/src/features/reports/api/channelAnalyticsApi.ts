/* eslint-disable @typescript-eslint/no-unused-vars */
import { format, subDays, subMonths } from 'date-fns';
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
  hour: number;      // 0-23
  dayOfWeek: number; // 0=Mon, 6=Sun
  count: number;
  intensity: number; // 0-1 normalized
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

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function seededRng(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ─── Mock generators ──────────────────────────────────────────────────────────

function mockStats(): ChannelStats {
  return {
    totalTransactions: 456_000,
    digitalTransactions: 380_000,
    digitalPct: 83.3,
    branchTransactions: 76_000,
    branchPct: 16.7,
    successRate: 99.2,
    avgResponseMs: 1400,
    revenueFees: 234_000_000,
  };
}

function mockVolumes(): ChannelVolume[] {
  return [
    { channel: 'MOBILE', label: 'Mobile', count: 205_200, pct: 45, color: '#3b82f6' },
    { channel: 'WEB',    label: 'Web',    count: 114_000, pct: 25, color: '#8b5cf6' },
    { channel: 'BRANCH', label: 'Branch', count:  68_400, pct: 15, color: '#6b7280' },
    { channel: 'ATM',    label: 'ATM',    count:  36_480, pct:  8, color: '#f59e0b' },
    { channel: 'USSD',   label: 'USSD',   count:  22_800, pct:  5, color: '#10b981' },
    { channel: 'POS',    label: 'POS',    count:   9_120, pct:  2, color: '#ef4444' },
  ];
}

function mockMixTrend(): ChannelMixPoint[] {
  const points: ChannelMixPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), 11 - i);
    const month = format(d, 'MMM yy');
    const progress = i / 11;
    const seed = i + 200;
    const noise = (s: number) => (seededRng(seed + s) - 0.5) * 2;
    points.push({
      month,
      mobile: Math.round(36 + progress * 9 + noise(1)),
      web:    Math.round(20 + progress * 5 + noise(2)),
      branch: Math.round(24 - progress * 9 + noise(3)),
      atm:    Math.round(10 - progress * 2 + noise(4)),
      ussd:   Math.round(7  + noise(5)),
      pos:    Math.round(3  - progress + noise(6)),
    });
  }
  return points;
}

function mockHeatmap(): HourlyHeatmapCell[] {
  const cells: HourlyHeatmapCell[] = [];
  const maxCount = 4800;
  const hourBase = [
    50, 30, 20, 15, 20, 60,
    200, 480, 620, 540, 460, 500,
    580, 560, 490, 420, 380, 340,
    300, 240, 180, 140, 100, 70,
  ];
  const dayMult = [1.0, 1.05, 1.0, 1.1, 1.15, 0.7, 0.4];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const seed = day * 24 + hour + 1;
      const noise = 1 + (seededRng(seed) - 0.5) * 0.25;
      const salaryBoost = day === 4 && hour >= 9 && hour <= 15 ? 1.4 : 1;
      const count = Math.round(hourBase[hour] * dayMult[day] * noise * salaryBoost);
      cells.push({ hour, dayOfWeek: day, count, intensity: Math.min(count / maxCount, 1) });
    }
  }
  return cells;
}

function mockSuccessRates(): ChannelSuccessRate[] {
  const raw = [
    { channel: 'MOBILE' as Channel, label: 'Mobile',  total: 205_200, fp: 0.5, tp: 0.3, avgMs: 820,  p95Ms: 2100 },
    { channel: 'WEB'    as Channel, label: 'Web',     total: 114_000, fp: 0.6, tp: 0.2, avgMs: 650,  p95Ms: 1800 },
    { channel: 'BRANCH' as Channel, label: 'Branch',  total:  68_400, fp: 0.3, tp: 0.1, avgMs: 380,  p95Ms:  900 },
    { channel: 'ATM'    as Channel, label: 'ATM',     total:  36_480, fp: 1.8, tp: 0.9, avgMs: 1250, p95Ms: 3400 },
    { channel: 'USSD'   as Channel, label: 'USSD',    total:  22_800, fp: 2.2, tp: 1.4, avgMs: 2100, p95Ms: 5800 },
    { channel: 'POS'    as Channel, label: 'POS',     total:   9_120, fp: 1.1, tp: 0.6, avgMs: 1640, p95Ms: 4200 },
    { channel: 'AGENT'  as Channel, label: 'Agent',   total:   7_600, fp: 0.8, tp: 0.4, avgMs: 1800, p95Ms: 4600 },
  ];
  return raw
    .map((r) => {
      const failed  = Math.round(r.total * r.fp / 100);
      const timeout = Math.round(r.total * r.tp / 100);
      const success = r.total - failed - timeout;
      return {
        channel: r.channel,
        label: r.label,
        total: r.total,
        success,
        failed,
        timeout,
        successPct: parseFloat(((success / r.total) * 100).toFixed(2)),
        avgLatencyMs: r.avgMs,
        p95LatencyMs: r.p95Ms,
      };
    })
    .sort((a, b) => a.successPct - b.successPct);
}

function mockSuccessTrend(): SuccessRateTrendPoint[] {
  const points: SuccessRateTrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const seed = i + 300;
    const n = (s: number) => (seededRng(seed + s) - 0.5) * 0.4;
    points.push({
      date:   format(d, 'dd MMM'),
      mobile: parseFloat((99.2 + n(1)).toFixed(2)),
      web:    parseFloat((99.4 + n(2)).toFixed(2)),
      branch: parseFloat((99.7 + n(3)).toFixed(2)),
    });
  }
  return points;
}

function mockAdoption(): DigitalAdoption {
  return {
    registeredUsers:     45_678,
    registeredGrowthPct: 12.4,
    activeUsers30d:      32_456,
    activePctOfTotal:    71.1,
    featureAdoption: [
      { feature: 'Transfers',        pct: 85 },
      { feature: 'Bill Payments',    pct: 65 },
      { feature: 'Statements',       pct: 78 },
      { feature: 'Card Controls',    pct: 45 },
      { feature: 'Loan Application', pct: 20 },
      { feature: 'Savings Goals',    pct: 38 },
    ],
    funnel: {
      registered:       45_678,
      firstLogin:       34_738,
      firstTransaction: 23_622,
      regularUser:      19_370,
    },
  };
}

function mockTxnTypes(): TransactionType[] {
  return [
    { type: 'TRANSFER_INTRA',   label: 'Intra-Bank Transfer',  count: 112_400, value: 24_800_000_000, avgAmount: 220_640, channelMix: 'Mobile 55%, Web 30%, Branch 15%', growthPct:  18.4 },
    { type: 'TRANSFER_INTER',   label: 'Inter-Bank Transfer',  count:  89_600, value: 31_200_000_000, avgAmount: 348_214, channelMix: 'Mobile 48%, Web 35%, Branch 17%', growthPct:  22.1 },
    { type: 'BILL_PAYMENT',     label: 'Bill Payment',         count:  68_200, value:  4_100_000_000, avgAmount:  60_117, channelMix: 'Mobile 72%, Web 20%, USSD 8%',    growthPct:  31.5 },
    { type: 'ATM_WITHDRAWAL',   label: 'ATM Withdrawal',       count:  36_480, value:  3_284_000_000, avgAmount:  90_000, channelMix: 'ATM 100%',                        growthPct:  -8.2 },
    { type: 'AIRTIME_DATA',     label: 'Airtime & Data',       count:  34_800, value:    416_000_000, avgAmount:  11_954, channelMix: 'Mobile 80%, USSD 15%, Web 5%',    growthPct:  14.7 },
    { type: 'POS_PURCHASE',     label: 'POS Purchase',         count:  22_800, value:  1_824_000_000, avgAmount:  80_000, channelMix: 'POS 100%',                        growthPct:   5.3 },
    { type: 'LOAN_DISBURSE',    label: 'Loan Disbursement',    count:  18_400, value: 18_400_000_000, avgAmount: 1_000_000, channelMix: 'Branch 60%, Mobile 30%, Web 10%', growthPct: 28.9 },
    { type: 'LOAN_REPAYMENT',   label: 'Loan Repayment',       count:  16_200, value:  8_100_000_000, avgAmount: 500_000, channelMix: 'Mobile 55%, Branch 25%, Web 20%', growthPct:  25.4 },
    { type: 'SAVINGS_DEPOSIT',  label: 'Savings Deposit',      count:  24_600, value:  7_380_000_000, avgAmount: 300_000, channelMix: 'Mobile 45%, Branch 35%, Web 20%', growthPct:   9.8 },
    { type: 'USSD_TRANSFER',    label: 'USSD Transfer',        count:  18_200, value:  1_092_000_000, avgAmount:  60_000, channelMix: 'USSD 100%',                       growthPct:  -3.1 },
    { type: 'AGENT_BANKING',    label: 'Agent Banking',        count:  14_320, value:  1_718_000_000, avgAmount: 120_000, channelMix: 'Agent 100%',                      growthPct:  42.6 },
  ].sort((a, b) => b.count - a.count);
}

function mockMigration(): { migrations: MigrationData[]; migrationScore: string } {
  return {
    migrations: [
      { fromChannel: 'BRANCH', toChannel: 'MOBILE', customerCount: 8_420, migrationPct: 34.2 },
      { fromChannel: 'BRANCH', toChannel: 'WEB',    customerCount: 4_210, migrationPct: 17.1 },
      { fromChannel: 'ATM',    toChannel: 'MOBILE', customerCount: 3_640, migrationPct: 47.8 },
      { fromChannel: 'ATM',    toChannel: 'WEB',    customerCount: 1_820, migrationPct: 23.9 },
      { fromChannel: 'USSD',   toChannel: 'MOBILE', customerCount: 2_340, migrationPct: 38.1 },
      { fromChannel: 'USSD',   toChannel: 'WEB',    customerCount:   780, migrationPct: 12.7 },
    ],
    migrationScore: '65% of previously branch-only customers now use mobile for >50% of transactions',
  };
}

// ─── Demo wrapper ─────────────────────────────────────────────────────────────

const DEMO_MODE = true;

async function withDemo<T>(mockFn: () => T, apiFn: () => Promise<T>): Promise<T> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 250));
    return mockFn();
  }
  return apiFn();
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const channelAnalyticsApi = {
  getChannelStats: (_params?: DateRangeParams): Promise<ChannelStats> =>
    withDemo(mockStats, () => apiGet<ChannelStats>('/v1/reports/channels/stats')),

  getChannelVolumes: (_params?: DateRangeParams): Promise<ChannelVolume[]> =>
    withDemo(mockVolumes, () => apiGet<ChannelVolume[]>('/v1/reports/channels/volumes')),

  getChannelMixTrend: (): Promise<ChannelMixPoint[]> =>
    withDemo(mockMixTrend, () => apiGet<ChannelMixPoint[]>('/v1/reports/channels/mix-trend')),

  getHourlyHeatmap: (_params?: DateRangeParams): Promise<HourlyHeatmapCell[]> =>
    withDemo(mockHeatmap, () => apiGet<HourlyHeatmapCell[]>('/v1/reports/channels/heatmap')),

  getChannelSuccessRates: (_params?: DateRangeParams): Promise<ChannelSuccessRate[]> =>
    withDemo(mockSuccessRates, () => apiGet<ChannelSuccessRate[]>('/v1/reports/channels/success-rates')),

  getSuccessRateTrend: (): Promise<SuccessRateTrendPoint[]> =>
    withDemo(mockSuccessTrend, () => apiGet<SuccessRateTrendPoint[]>('/v1/reports/channels/success-trend')),

  getDigitalAdoption: (): Promise<DigitalAdoption> =>
    withDemo(mockAdoption, () => apiGet<DigitalAdoption>('/v1/reports/channels/digital-adoption')),

  getTransactionTypes: (_params?: DateRangeParams): Promise<TransactionType[]> =>
    withDemo(mockTxnTypes, () => apiGet<TransactionType[]>('/v1/reports/channels/transaction-types')),

  getMigrationData: (): Promise<{ migrations: MigrationData[]; migrationScore: string }> =>
    withDemo(mockMigration, () => apiGet('/v1/reports/channels/migration')),
};
