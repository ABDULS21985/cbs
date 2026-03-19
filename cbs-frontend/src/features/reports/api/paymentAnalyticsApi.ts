import { apiGet } from '@/lib/api';

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

// ─── API Object ────────────────────────────────────────────────────────────────

export const paymentAnalyticsApi = {
  getStats: (params: DateRangeParams): Promise<PaymentStats> =>
    apiGet<PaymentStats>('/v1/reports/payments/stats', params as unknown as Record<string, unknown>),

  getVolumeTrend: (params: { dateFrom: string; dateTo: string; groupBy: 'day' | 'week' | 'month' }): Promise<VolumeTrendPoint[]> =>
    apiGet<VolumeTrendPoint[]>('/v1/reports/payments/volume-trend', params as unknown as Record<string, unknown>),

  getChannelBreakdown: (params: DateRangeParams): Promise<ChannelBreakdown[]> =>
    apiGet<ChannelBreakdown[]>('/v1/reports/payments/channel-breakdown', params as unknown as Record<string, unknown>),

  getFailureAnalysis: (params: DateRangeParams): Promise<{ reasons: FailureReason[]; topFailed: FailedTransaction[] }> =>
    apiGet<{ reasons: FailureReason[]; topFailed: FailedTransaction[] }>('/v1/reports/payments/failures', params as unknown as Record<string, unknown>),

  getRailsUtilization: (params: DateRangeParams): Promise<RailUtilization[]> =>
    apiGet<RailUtilization[]>('/v1/reports/payments/rails', params as unknown as Record<string, unknown>),

  getReconciliationSummary: (params: DateRangeParams): Promise<ReconciliationRow[]> =>
    apiGet<ReconciliationRow[]>('/v1/reports/payments/reconciliation', params as unknown as Record<string, unknown>),
};
