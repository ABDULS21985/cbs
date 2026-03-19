import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GapBucket {
  bucket: string;
  assets: number;
  liabilities: number;
  gap: number;
  cumulativeGap: number;
}

export interface DurationAnalysis {
  assetsDuration: number;
  liabilitiesDuration: number;
  equityDuration: number;
  durationGap: number;
  equityValueChange1PctBps: number;
  portfolioBreakdown: { category: string; duration: number; amount: number }[];
}

export interface DurationTrendPoint {
  month: string;
  assetsDuration: number;
  liabilitiesDuration: number;
  gap: number;
}

export interface NiiScenario {
  rateChangeBps: number;
  niiImpact: number;
  niiChangePct: number;
  baseNii: boolean;
}

export interface FxPosition {
  currency: string;
  assets: number;
  liabilities: number;
  netOpenPosition: number;
  nopLimit: number;
  utilizationPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface LiquidityRatio {
  metric: string;
  value: number;
  limit: number;
  unit: string;
  status: 'COMPLIANT' | 'WARNING' | 'BREACH';
}

export interface RateOutlookItem {
  tenor: string;
  currentRate: number;
  forecastRate: number;
  change: number;
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const almReportApi = {
  getGapAnalysis: (asOfDate: string): Promise<GapBucket[]> =>
    apiGet<GapBucket[]>('/api/v1/reports/treasury/gap-analysis', { asOfDate }),

  getDurationAnalysis: (asOfDate: string): Promise<DurationAnalysis> =>
    apiGet<DurationAnalysis>('/api/v1/reports/treasury/duration', { asOfDate }),

  getNiiSensitivity: (asOfDate: string): Promise<NiiScenario[]> =>
    apiGet<NiiScenario[]>('/api/v1/reports/treasury/nii-sensitivity', { asOfDate }),

  getFxExposure: (asOfDate: string): Promise<FxPosition[]> =>
    apiGet<FxPosition[]>('/api/v1/reports/treasury/fx-exposure', { asOfDate }),

  getLiquidityRatios: (asOfDate: string): Promise<LiquidityRatio[]> =>
    apiGet<LiquidityRatio[]>('/api/v1/reports/treasury/liquidity', { asOfDate }),

  getRateOutlook: (): Promise<RateOutlookItem[]> =>
    apiGet<RateOutlookItem[]>('/api/v1/reports/treasury/rate-outlook'),

  getDurationTrend: (months = 12): Promise<DurationTrendPoint[]> =>
    apiGet<DurationTrendPoint[]>('/api/v1/reports/treasury/duration-trend', { months }),
};
