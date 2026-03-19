import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DepositStats {
  total: number;
  savings: number;
  current: number;
  term: number;
  costOfFunds: number; // percentage
  avgDeposit: number;
  newDepositsMTD: number;
  retentionRate: number; // percentage
}

export interface DepositMixItem {
  name: string;
  amount: number;
  pct: number;
  color: string;
  children?: DepositMixItem[];
}

export interface DepositGrowthPoint {
  month: string;
  savings: number;
  current: number;
  term: number;
  total: number;
}

export interface TopDepositor {
  rank: number;
  name: string;
  segment: 'RETAIL' | 'SME' | 'CORPORATE' | 'GOVERNMENT';
  amount: number;
  pct: number;
  type: string;
  riskFlag?: boolean;
}

export interface MaturityBucket {
  month: string;
  amount: number;
  count: number;
  avgRate: number;
  avgTenor: number;
  rolloverPct: number;
}

export interface RateBand {
  band: string;
  amount: number;
  count: number;
  pct: number;
  color: string;
}

export interface CostOfFundsPoint {
  month: string;
  savings: number;
  current: number;
  term: number;
  overall: number;
  mpr: number;
}

export interface RetentionVintage {
  vintage: string;
  month: string;
  retentionRate: number;
}

export interface RateSensitivityPoint {
  amount: number;
  rate: number;
  segment: string;
}

export interface ChurnStat {
  avgTenureMonths: number;
  totalClosed: number;
  reasons: { reason: string; count: number; pct: number }[];
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const depositAnalyticsApi = {
  getDepositStats: (): Promise<DepositStats> =>
    apiGet<DepositStats>('/api/v1/reports/deposits/stats'),

  getDepositMix: (): Promise<DepositMixItem[]> =>
    apiGet<DepositMixItem[]>('/api/v1/reports/deposits/mix').catch(() => []),

  getDepositGrowthTrend: (): Promise<DepositGrowthPoint[]> =>
    apiGet<DepositGrowthPoint[]>('/api/v1/reports/deposits/growth-trend').catch(() => []),

  getTopDepositors: (): Promise<TopDepositor[]> =>
    apiGet<TopDepositor[]>('/api/v1/reports/deposits/top-depositors').catch(() => []),

  getMaturityProfile: (): Promise<MaturityBucket[]> =>
    apiGet<MaturityBucket[]>('/api/v1/reports/deposits/maturity-profile').catch(() => []),

  getRateBands: (): Promise<RateBand[]> =>
    apiGet<RateBand[]>('/api/v1/reports/deposits/rate-bands').catch(() => []),

  getRateSensitivityData: (): Promise<RateSensitivityPoint[]> =>
    apiGet<RateSensitivityPoint[]>('/api/v1/reports/deposits/rate-sensitivity').catch(() => []),

  getCostOfFundsTrend: (): Promise<CostOfFundsPoint[]> =>
    apiGet<CostOfFundsPoint[]>('/api/v1/reports/deposits/cost-of-funds').catch(() => []),

  getRetentionVintage: (): Promise<RetentionVintage[]> =>
    apiGet<RetentionVintage[]>('/api/v1/reports/deposits/retention-vintage').catch(() => []),

  getChurnAnalysis: (): Promise<ChurnStat> =>
    apiGet<ChurnStat>('/api/v1/reports/deposits/churn'),
};
