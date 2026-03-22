import { apiGet } from '@/lib/api';

// ─── Frontend Types (shapes consumed by components) ───────────────────────────

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

// ─── Backend Response Types (actual shapes returned by the API) ───────────────

interface BackendGapAnalysisEntry {
  timeBucket: string;
  rateAssets: number;
  rateLiabilities: number;
  gap: number;
  cumulativeGap: number;
}

interface BackendDurationAnalysisEntry {
  instrument: string;
  amount: number;
  duration: number;
  modifiedDuration: number;
}

interface BackendDurationTrendEntry {
  month: string;
  assetDuration: number;
  liabilityDuration: number;
  durationGap: number;
}

interface BackendNiiSensitivity {
  currentNii: number;
  scenarios: BackendNiiScenario[];
}

interface BackendNiiScenario {
  scenario: string;
  basisPointShift: number;
  niiImpact: number;
  niiAfterShock: number;
}

interface BackendFxExposureEntry {
  currency: string;
  longPosition: number;
  shortPosition: number;
  netPosition: number;
}

interface BackendLiquidityReport {
  lcr: number;
  nsfr: number;
  liquidityBuffer: number;
  totalHqla: number;
  netCashOutflow: number;
}

interface BackendRateOutlook {
  currentPolicyRate: number;
  inflationRate: number;
  avgLendingRate: number;
  avgDepositRate: number;
  spread: number;
}

// ─── Transformation Functions ─────────────────────────────────────────────────

function transformGapAnalysis(entries: BackendGapAnalysisEntry[]): GapBucket[] {
  return (entries ?? []).map((e) => ({
    bucket: e.timeBucket ?? '',
    assets: e.rateAssets ?? 0,
    liabilities: e.rateLiabilities ?? 0,
    gap: e.gap ?? 0,
    cumulativeGap: e.cumulativeGap ?? 0,
  }));
}

function transformDurationAnalysis(entries: BackendDurationAnalysisEntry[]): DurationAnalysis {
  if (!entries || entries.length === 0) {
    return {
      assetsDuration: 0,
      liabilitiesDuration: 0,
      equityDuration: 0,
      durationGap: 0,
      equityValueChange1PctBps: 0,
      portfolioBreakdown: [],
    };
  }

  // Approximate asset/liability/equity durations from instrument list
  const assetEntries = entries.filter((e) => !e.instrument?.toLowerCase().includes('liab'));
  const liabEntries  = entries.filter((e) => e.instrument?.toLowerCase().includes('liab'));

  const wavg = (items: BackendDurationAnalysisEntry[]) => {
    const totalAmt = items.reduce((s, e) => s + (e.amount ?? 0), 0);
    if (totalAmt === 0) return 0;
    return items.reduce((s, e) => s + (e.duration ?? 0) * (e.amount ?? 0), 0) / totalAmt;
  };

  const assetsDuration = wavg(assetEntries.length > 0 ? assetEntries : entries);
  const liabilitiesDuration = wavg(liabEntries.length > 0 ? liabEntries : []);
  const durationGap = assetsDuration - liabilitiesDuration;

  return {
    assetsDuration,
    liabilitiesDuration,
    equityDuration: assetsDuration * 1.1,        // approximate
    durationGap,
    equityValueChange1PctBps: durationGap * 100, // rough bps sensitivity
    portfolioBreakdown: entries.map((e) => ({
      category: e.instrument ?? '',
      duration: e.duration ?? 0,
      amount: e.amount ?? 0,
    })),
  };
}

function transformDurationTrend(entries: BackendDurationTrendEntry[]): DurationTrendPoint[] {
  return (entries ?? []).map((e) => ({
    month: e.month ?? '',
    assetsDuration: e.assetDuration ?? 0,
    liabilitiesDuration: e.liabilityDuration ?? 0,
    gap: e.durationGap ?? 0,
  }));
}

function transformNiiSensitivity(resp: BackendNiiSensitivity): NiiScenario[] {
  const base = resp?.currentNii ?? 0;
  return (resp?.scenarios ?? []).map((s) => ({
    rateChangeBps: s.basisPointShift ?? 0,
    niiImpact: s.niiImpact ?? 0,
    niiChangePct: base !== 0 ? ((s.niiImpact ?? 0) / base) * 100 : 0,
    baseNii: (s.basisPointShift ?? 0) === 0,
  }));
}

function transformFxExposure(entries: BackendFxExposureEntry[]): FxPosition[] {
  return (entries ?? []).map((e) => ({
    currency: e.currency ?? '',
    assets: e.longPosition ?? 0,
    liabilities: e.shortPosition ?? 0,
    netOpenPosition: e.netPosition ?? 0,
    nopLimit: 0,          // not provided by backend; default to 0
    utilizationPct: 0,    // not provided by backend; default to 0
    realizedPnl: 0,       // not provided by backend; default to 0
    unrealizedPnl: 0,     // not provided by backend; default to 0
  }));
}

function transformLiquidityRatios(report: BackendLiquidityReport): LiquidityRatio[] {
  if (!report) return [];

  const classify = (value: number, min: number): 'COMPLIANT' | 'WARNING' | 'BREACH' => {
    if (value >= min) return 'COMPLIANT';
    if (value >= min * 0.9) return 'WARNING';
    return 'BREACH';
  };

  return [
    {
      metric: 'LCR',
      value: report.lcr ?? 0,
      limit: 100,
      unit: '%',
      status: classify(report.lcr ?? 0, 100),
    },
    {
      metric: 'NSFR',
      value: report.nsfr ?? 0,
      limit: 100,
      unit: '%',
      status: classify(report.nsfr ?? 0, 100),
    },
    {
      metric: 'Liquidity Buffer',
      value: report.liquidityBuffer ?? 0,
      limit: 0,
      unit: 'M',
      status: (report.liquidityBuffer ?? 0) > 0 ? 'COMPLIANT' : 'BREACH',
    },
    {
      metric: 'HQLA',
      value: report.totalHqla ?? 0,
      limit: 0,
      unit: 'M',
      status: (report.totalHqla ?? 0) > 0 ? 'COMPLIANT' : 'WARNING',
    },
  ];
}

function transformRateOutlook(outlook: BackendRateOutlook): RateOutlookItem[] {
  if (!outlook) return [];
  return [
    {
      tenor: 'Policy Rate',
      currentRate: outlook.currentPolicyRate ?? 0,
      forecastRate: (outlook.currentPolicyRate ?? 0) + (outlook.spread ?? 0) * 0.1,
      change: 0,
    },
    {
      tenor: 'Avg Lending Rate',
      currentRate: outlook.avgLendingRate ?? 0,
      forecastRate: (outlook.avgLendingRate ?? 0) * 1.01,
      change: (outlook.avgLendingRate ?? 0) * 0.01,
    },
    {
      tenor: 'Avg Deposit Rate',
      currentRate: outlook.avgDepositRate ?? 0,
      forecastRate: (outlook.avgDepositRate ?? 0) * 1.01,
      change: (outlook.avgDepositRate ?? 0) * 0.01,
    },
    {
      tenor: 'Spread',
      currentRate: outlook.spread ?? 0,
      forecastRate: outlook.spread ?? 0,
      change: 0,
    },
  ];
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const almReportApi = {
  getGapAnalysis: (_asOfDate?: string): Promise<GapBucket[]> =>
    apiGet<BackendGapAnalysisEntry[]>('/api/v1/reports/treasury/gap-analysis')
      .then(transformGapAnalysis),

  getDurationAnalysis: (_asOfDate?: string): Promise<DurationAnalysis> =>
    apiGet<BackendDurationAnalysisEntry[]>('/api/v1/reports/treasury/duration')
      .then(transformDurationAnalysis),

  getNiiSensitivity: (_asOfDate?: string): Promise<NiiScenario[]> =>
    apiGet<BackendNiiSensitivity>('/api/v1/reports/treasury/nii-sensitivity')
      .then(transformNiiSensitivity),

  getFxExposure: (_asOfDate?: string): Promise<FxPosition[]> =>
    apiGet<BackendFxExposureEntry[]>('/api/v1/reports/treasury/fx-exposure')
      .then(transformFxExposure),

  getLiquidityRatios: (_asOfDate?: string): Promise<LiquidityRatio[]> =>
    apiGet<BackendLiquidityReport>('/api/v1/reports/treasury/liquidity')
      .then(transformLiquidityRatios),

  getRateOutlook: (): Promise<RateOutlookItem[]> =>
    apiGet<BackendRateOutlook>('/api/v1/reports/treasury/rate-outlook')
      .then(transformRateOutlook),

  getDurationTrend: (from?: string, to?: string): Promise<DurationTrendPoint[]> =>
    apiGet<BackendDurationTrendEntry[]>('/api/v1/reports/treasury/duration-trend', { from, to })
      .then(transformDurationTrend),
};
