import { apiGet } from '@/lib/api';
import { format, subMonths } from 'date-fns';

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

// ─── Demo Data Generators ─────────────────────────────────────────────────────

function buildGapAnalysis(): GapBucket[] {
  const rows = [
    { bucket: '0–1 Month', assets: 485_000_000_000, liabilities: 620_000_000_000 },
    { bucket: '1–3 Months', assets: 312_000_000_000, liabilities: 280_000_000_000 },
    { bucket: '3–6 Months', assets: 198_000_000_000, liabilities: 145_000_000_000 },
    { bucket: '6–12 Months', assets: 156_000_000_000, liabilities: 120_000_000_000 },
    { bucket: '1–3 Years', assets: 245_000_000_000, liabilities: 180_000_000_000 },
    { bucket: '3–5 Years', assets: 132_000_000_000, liabilities: 88_000_000_000 },
    { bucket: '5+ Years', assets: 78_000_000_000, liabilities: 42_000_000_000 },
  ];
  let cumulative = 0;
  return rows.map((r) => {
    const gap = r.assets - r.liabilities;
    cumulative += gap;
    return { ...r, gap, cumulativeGap: cumulative };
  });
}

function buildDurationAnalysis(): DurationAnalysis {
  return {
    assetsDuration: 3.42,
    liabilitiesDuration: 1.87,
    equityDuration: 8.64,
    durationGap: 1.55,
    equityValueChange1PctBps: -12_400_000_000,
    portfolioBreakdown: [
      { category: 'Loans & Advances', duration: 3.8, amount: 680_000_000_000 },
      { category: 'Investment Securities', duration: 4.2, amount: 320_000_000_000 },
      { category: 'Treasury Bills', duration: 0.5, amount: 145_000_000_000 },
      { category: 'FGN Bonds', duration: 7.1, amount: 98_000_000_000 },
      { category: 'Interbank Placements', duration: 0.2, amount: 62_000_000_000 },
      { category: 'Customer Deposits', duration: 1.2, amount: -520_000_000_000 },
      { category: 'Borrowings', duration: 3.4, amount: -185_000_000_000 },
    ],
  };
}

function buildDurationTrend(months: number): DurationTrendPoint[] {
  const adjustments = [0.3, 0.18, 0.05, -0.08, -0.12, 0.02, 0.15, 0.22, 0.1, -0.05, 0.08, 0];
  return Array.from({ length: months }, (_, i) => {
    const d = subMonths(new Date(), months - 1 - i);
    const adj = adjustments[i] ?? 0;
    const assetsDuration = parseFloat((3.42 + adj).toFixed(2));
    const liabilitiesDuration = parseFloat((1.87 + adj * 0.4).toFixed(2));
    return {
      month: format(d, 'MMM yyyy'),
      assetsDuration,
      liabilitiesDuration,
      gap: parseFloat((assetsDuration - liabilitiesDuration).toFixed(2)),
    };
  });
}

function buildNiiSensitivity(): NiiScenario[] {
  const base = 48_200_000_000;
  return [
    { rateChangeBps: -200, niiChangePct: -18.4 },
    { rateChangeBps: -150, niiChangePct: -13.2 },
    { rateChangeBps: -100, niiChangePct: -8.6 },
    { rateChangeBps: -50, niiChangePct: -4.1 },
    { rateChangeBps: 0, niiChangePct: 0 },
    { rateChangeBps: 100, niiChangePct: 7.8 },
    { rateChangeBps: 200, niiChangePct: 14.3 },
  ].map((s) => ({
    rateChangeBps: s.rateChangeBps,
    niiImpact: base + base * (s.niiChangePct / 100),
    niiChangePct: s.niiChangePct,
    baseNii: s.rateChangeBps === 0,
  }));
}

function buildFxExposure(): FxPosition[] {
  return [
    {
      currency: 'USD',
      assets: 42_800_000_000,
      liabilities: 38_400_000_000,
      netOpenPosition: 4_400_000_000,
      nopLimit: 8_000_000_000,
      utilizationPct: 55,
      realizedPnl: 380_000_000,
      unrealizedPnl: 124_000_000,
    },
    {
      currency: 'EUR',
      assets: 12_600_000_000,
      liabilities: 14_200_000_000,
      netOpenPosition: -1_600_000_000,
      nopLimit: 4_000_000_000,
      utilizationPct: 40,
      realizedPnl: 92_000_000,
      unrealizedPnl: -38_000_000,
    },
    {
      currency: 'GBP',
      assets: 8_400_000_000,
      liabilities: 6_800_000_000,
      netOpenPosition: 1_600_000_000,
      nopLimit: 2_000_000_000,
      utilizationPct: 80,
      realizedPnl: 64_000_000,
      unrealizedPnl: 21_000_000,
    },
  ];
}

function buildLiquidityRatios(): LiquidityRatio[] {
  return [
    { metric: 'LCR', value: 142.6, limit: 100, unit: '%', status: 'COMPLIANT' },
    { metric: 'NSFR', value: 118.4, limit: 100, unit: '%', status: 'COMPLIANT' },
    { metric: 'CRR', value: 32.8, limit: 32.5, unit: '%', status: 'COMPLIANT' },
    { metric: 'LDR', value: 68.4, limit: 80, unit: '%', status: 'COMPLIANT' },
    { metric: 'Liquidity Ratio', value: 38.2, limit: 30, unit: '%', status: 'COMPLIANT' },
    { metric: 'Net Liquidity Gap', value: -4.2, limit: -10, unit: '%', status: 'WARNING' },
  ];
}

function buildRateOutlook(): RateOutlookItem[] {
  return [
    { tenor: 'O/N', currentRate: 27.5, forecastRate: 27.0, change: -0.5 },
    { tenor: '1 Month', currentRate: 27.8, forecastRate: 27.4, change: -0.4 },
    { tenor: '3 Months', currentRate: 28.2, forecastRate: 27.8, change: -0.4 },
    { tenor: '6 Months', currentRate: 19.5, forecastRate: 19.8, change: 0.3 },
    { tenor: '1 Year', currentRate: 20.1, forecastRate: 20.6, change: 0.5 },
    { tenor: '2 Years', currentRate: 20.8, forecastRate: 21.5, change: 0.7 },
    { tenor: '3 Years', currentRate: 18.2, forecastRate: 19.0, change: 0.8 },
    { tenor: '5 Years', currentRate: 17.6, forecastRate: 18.5, change: 0.9 },
    { tenor: '10 Years', currentRate: 16.8, forecastRate: 17.8, change: 1.0 },
  ];
}

// ─── Demo-mode wrapper ────────────────────────────────────────────────────────

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

function withDemo<T>(mock: () => T, live: () => Promise<T>): Promise<T> {
  if (DEMO_MODE) {
    return new Promise<T>((resolve) =>
      setTimeout(() => resolve(mock()), 350 + Math.random() * 250),
    );
  }
  return live();
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const almReportApi = {
  getGapAnalysis: (asOfDate: string): Promise<GapBucket[]> =>
    withDemo(
      () => buildGapAnalysis(),
      () => apiGet<GapBucket[]>('/v1/reports/treasury/gap-analysis', { asOfDate }),
    ),

  getDurationAnalysis: (asOfDate: string): Promise<DurationAnalysis> =>
    withDemo(
      () => buildDurationAnalysis(),
      () => apiGet<DurationAnalysis>('/v1/reports/treasury/duration', { asOfDate }),
    ),

  getNiiSensitivity: (asOfDate: string): Promise<NiiScenario[]> =>
    withDemo(
      () => buildNiiSensitivity(),
      () => apiGet<NiiScenario[]>('/v1/reports/treasury/nii-sensitivity', { asOfDate }),
    ),

  getFxExposure: (asOfDate: string): Promise<FxPosition[]> =>
    withDemo(
      () => buildFxExposure(),
      () => apiGet<FxPosition[]>('/v1/reports/treasury/fx-exposure', { asOfDate }),
    ),

  getLiquidityRatios: (asOfDate: string): Promise<LiquidityRatio[]> =>
    withDemo(
      () => buildLiquidityRatios(),
      () => apiGet<LiquidityRatio[]>('/v1/reports/treasury/liquidity', { asOfDate }),
    ),

  getRateOutlook: (): Promise<RateOutlookItem[]> =>
    withDemo(
      () => buildRateOutlook(),
      () => apiGet<RateOutlookItem[]>('/v1/reports/treasury/rate-outlook'),
    ),

  getDurationTrend: (months = 12): Promise<DurationTrendPoint[]> =>
    withDemo(
      () => buildDurationTrend(months),
      () => apiGet<DurationTrendPoint[]>('/v1/reports/treasury/duration-trend', { months }),
    ),
};
