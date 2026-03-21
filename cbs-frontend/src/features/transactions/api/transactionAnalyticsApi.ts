import { apiGet } from '@/lib/api';

export interface AnalyticsRangeParams {
  from: string;
  to: string;
}

export interface LargestTransaction {
  id: number;
  reference: string;
  amount: number;
}

export interface ChannelShare {
  channel: string;
  percentage: number;
  count: number;
  value: number;
  successRate: number;
  averageValue: number;
}

export interface TransactionAnalyticsSummary {
  totalTransactions: number;
  totalValue: number;
  averageTransactionValue: number;
  largestTransaction: LargestTransaction | null;
  mostUsedChannel: ChannelShare | null;
  failureRate: number;
  reversalRate: number;
}

export interface TransactionVolumeTrendPoint {
  periodStart: string;
  periodEnd: string;
  label: string;
  creditCount: number;
  debitCount: number;
  creditValue: number;
  debitValue: number;
  totalValue: number;
}

export interface SpendCategoryBreakdownRow {
  category: string;
  amount: number;
  count: number;
  average: number;
  percentage: number;
}

export interface SpendCategoryTrendPoint {
  period: string;
  periodStart: string;
  category: string;
  amount: number;
}

export interface SpendCategoryAnalytics {
  totalSpend: number;
  categories: SpendCategoryBreakdownRow[];
  trend: SpendCategoryTrendPoint[];
}

export interface ChannelMetric {
  channel: string;
  volume: number;
  value: number;
  successRate: number;
  averageValue: number;
}

export interface ChannelTrendPoint {
  period: string;
  periodStart: string;
  channel: string;
  successRate: number;
}

export interface ChannelAnalytics {
  channels: ChannelMetric[];
  successRateTrend: ChannelTrendPoint[];
}

export interface TopAccountActivity {
  accountNumber: string;
  accountName: string;
  transactionCount: number;
  totalDebit: number;
  totalCredit: number;
  netAmount: number;
  lastTransactionDate: string;
}

export interface FailureTrendPoint {
  date: string;
  failureCount: number;
  totalCount: number;
  failureRate: number;
}

export interface FailureReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

export interface FailureHotspot {
  hour: number;
  count: number;
}

export interface TopFailingAccount {
  accountNumber: string;
  accountName: string;
  failureCount: number;
  lastFailureReason: string;
  lastFailureDate: string;
}

export interface FailureAnalysis {
  failureRate: number;
  thresholdBreached: boolean;
  trend: FailureTrendPoint[];
  reasons: FailureReasonBreakdown[];
  hotspots: FailureHotspot[];
  topFailingAccounts: TopFailingAccount[];
}

export interface HeatmapCell {
  dayOfWeek: number;
  dayLabel: string;
  hour: number;
  count: number;
  anomaly: boolean;
}

export interface HeatmapAnomaly {
  dayLabel: string;
  hour: number;
  count: number;
  averageCount: number;
  standardDeviation: number;
}

export interface HourlyHeatmap {
  cells: HeatmapCell[];
  anomalies: HeatmapAnomaly[];
  anomalyCount: number;
}

export const transactionAnalyticsApi = {
  getSummary: (params: AnalyticsRangeParams): Promise<TransactionAnalyticsSummary> =>
    apiGet<TransactionAnalyticsSummary>('/api/v1/transactions/analytics/summary', params as unknown as Record<string, unknown>),

  getVolumeTrend: (params: AnalyticsRangeParams & { granularity: 'day' | 'week' | 'month' }): Promise<TransactionVolumeTrendPoint[]> =>
    apiGet<TransactionVolumeTrendPoint[]>('/api/v1/transactions/analytics/volume-trend', params as unknown as Record<string, unknown>),

  getCategories: (params: AnalyticsRangeParams): Promise<SpendCategoryAnalytics> =>
    apiGet<SpendCategoryAnalytics>('/api/v1/transactions/analytics/categories', params as unknown as Record<string, unknown>),

  getChannels: (params: AnalyticsRangeParams): Promise<ChannelAnalytics> =>
    apiGet<ChannelAnalytics>('/api/v1/transactions/analytics/channels', params as unknown as Record<string, unknown>),

  getTopAccounts: (params: AnalyticsRangeParams & { limit?: number }): Promise<TopAccountActivity[]> =>
    apiGet<TopAccountActivity[]>('/api/v1/transactions/analytics/top-accounts', params as unknown as Record<string, unknown>),

  getFailures: (params: AnalyticsRangeParams): Promise<FailureAnalysis> =>
    apiGet<FailureAnalysis>('/api/v1/transactions/analytics/failures', params as unknown as Record<string, unknown>),

  getHourlyHeatmap: (params: AnalyticsRangeParams): Promise<HourlyHeatmap> =>
    apiGet<HourlyHeatmap>('/api/v1/transactions/analytics/hourly-heatmap', params as unknown as Record<string, unknown>),
};
