import { apiGet } from '@/lib/api';

// ─── Frontend Types (consumed by deposit analytics components) ────────────────

export interface DepositStats {
  total: number;
  savings: number;
  current: number;
  term: number;
  costOfFunds: number;       // percentage
  avgDeposit: number;
  newDepositsMTD: number;
  retentionRate: number;     // percentage
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

export interface DepositSegmentEntry {
  segment: string;
  totalDeposits: number;
  percentage: number;
  accountCount: number;
}

// ─── Backend Response Types ───────────────────────────────────────────────────

interface BackendDepositStats {
  totalDeposits: number;
  accountCount: number;
  averageBalance: number;
  concentrationRatio: number;
  priorPeriodValue?: number;
  changePercent?: number;
  changeDirection?: string;
}

interface BackendDepositMixEntry {
  productType: string;
  count: number;
  amount: number;
  percentage: number;
}

interface BackendDepositGrowthEntry {
  month: string;
  totalDeposits: number;
  growthAmount: number;
  growthPercent: number;
}

interface BackendTopDepositor {
  customerName: string;
  cifNumber: string;
  totalDeposits: number;
  percentage: number;
}

interface BackendMaturityBucket {
  bucket: string;
  count: number;
  amount: number;
  percentage: number;
}

interface BackendRateBandEntry {
  rateBand: string;
  count: number;
  amount: number;
  percentage: number;
}

interface BackendRateSensitivityEntry {
  bucket: string;
  amount: number;
  cumulativeGap: number;
}

interface BackendCostOfFundsEntry {
  productType: string;
  balance: number;
  weightedAvgRate: number;
  interestCost: number;
}

interface BackendRetentionVintageEntry {
  cohort: string;
  opened: number;
  active: number;
  retentionRate: number;
}

interface BackendDepositChurnEntry {
  month: string;
  closed: number;
  closedAmount: number;
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const PRODUCT_COLORS = ['#2563eb', '#0891b2', '#0f766e', '#7c3aed', '#d97706', '#dc2626', '#4f46e5', '#16a34a'];
const RATE_BAND_COLORS = ['#16a34a', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#991b1b'];

function colorAt(palette: string[], i: number) { return palette[i % palette.length]; }

// ─── Transformation Functions ─────────────────────────────────────────────────

function transformDepositStats(raw: BackendDepositStats): DepositStats {
  // Backend returns a total; the product-level breakdown is not in this DTO.
  // Approximate CASA/term split using deposit mix (not available here, so leave as 0).
  return {
    total:          raw.totalDeposits  ?? 0,
    savings:        0,   // requires product-level split — see getDepositMix
    current:        0,
    term:           0,
    costOfFunds:    0,   // requires cost-of-funds endpoint
    avgDeposit:     raw.averageBalance ?? 0,
    newDepositsMTD: 0,
    retentionRate:  0,
  };
}

function transformDepositMix(entries: BackendDepositMixEntry[]): DepositMixItem[] {
  return (entries ?? []).map((e, i) => ({
    name:   e.productType ?? '',
    amount: e.amount      ?? 0,
    pct:    e.percentage  ?? 0,
    color:  colorAt(PRODUCT_COLORS, i),
  }));
}

function transformDepositGrowth(entries: BackendDepositGrowthEntry[]): DepositGrowthPoint[] {
  return (entries ?? []).map((e) => ({
    month:   e.month        ?? '',
    total:   e.totalDeposits ?? 0,
    // Without product breakdown per month, default sub-types to 0
    savings: 0,
    current: 0,
    term:    0,
  }));
}

function transformTopDepositors(entries: BackendTopDepositor[]): TopDepositor[] {
  return (entries ?? []).map((e, i) => ({
    rank:    i + 1,
    name:    e.customerName  ?? '',
    segment: 'RETAIL',       // backend does not expose segment on this DTO
    amount:  e.totalDeposits ?? 0,
    pct:     e.percentage    ?? 0,
    type:    'FIXED',        // default; backend doesn't expose account type here
  }));
}

function transformMaturityProfile(entries: BackendMaturityBucket[]): MaturityBucket[] {
  return (entries ?? []).map((e) => ({
    month:       e.bucket     ?? '',
    amount:      e.amount     ?? 0,
    count:       e.count      ?? 0,
    avgRate:     0,           // not in backend DTO
    avgTenor:    0,
    rolloverPct: e.percentage ?? 0,
  }));
}

function transformRateBands(entries: BackendRateBandEntry[]): RateBand[] {
  return (entries ?? []).map((e, i) => ({
    band:   e.rateBand   ?? '',
    amount: e.amount     ?? 0,
    count:  e.count      ?? 0,
    pct:    e.percentage ?? 0,
    color:  colorAt(RATE_BAND_COLORS, i),
  }));
}

function transformRateSensitivity(entries: BackendRateSensitivityEntry[]): RateSensitivityPoint[] {
  // Backend provides cumulative-gap analysis buckets; approximate scatter-plot points
  return (entries ?? []).map((e, i) => ({
    amount:  e.amount        ?? 0,
    rate:    e.cumulativeGap ?? 0,
    segment: e.bucket        ?? `Bucket ${i + 1}`,
  }));
}

function transformCostOfFunds(entries: BackendCostOfFundsEntry[]): CostOfFundsPoint[] {
  // Backend provides product-level cost-of-funds; map to a single monthly summary point.
  // Since there's no month dimension, use product type as label.
  if (!entries || entries.length === 0) return [];

  const overall = entries.reduce((s, e) => s + (e.weightedAvgRate ?? 0), 0) / entries.length;

  // Return one point per product type, using productType as "month" label
  return entries.map((e) => ({
    month:   e.productType      ?? '',
    savings: e.productType?.toLowerCase().includes('saving') ? e.weightedAvgRate ?? 0 : 0,
    current: e.productType?.toLowerCase().includes('current') ? e.weightedAvgRate ?? 0 : 0,
    term:    e.productType?.toLowerCase().includes('fixed') || e.productType?.toLowerCase().includes('term') ? e.weightedAvgRate ?? 0 : 0,
    overall,
    mpr:     0,  // monetary policy rate not in backend; leave as 0
  }));
}

function transformRetentionVintage(entries: BackendRetentionVintageEntry[]): RetentionVintage[] {
  // BackendRetentionVintageEntry has cohort/opened/active/retentionRate but no "month".
  // Expose cohort as vintage; use empty month string.
  return (entries ?? []).map((e) => ({
    vintage:       e.cohort        ?? '',
    month:         '',
    retentionRate: e.retentionRate ?? 0,
  }));
}

/**
 * Backend returns List<DepositChurnEntry> (monthly series), but the frontend
 * expects ChurnStat (a single summary object). Aggregate the list here.
 */
function transformChurnAnalysis(entries: BackendDepositChurnEntry[]): ChurnStat {
  const safe = entries ?? [];
  const totalClosed = safe.reduce((s, e) => s + (e.closed ?? 0), 0);
  return {
    avgTenureMonths: 0,   // not available from backend
    totalClosed,
    reasons: [],          // reason breakdown not in backend DTO
  };
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const depositAnalyticsApi = {
  getDepositStats: (): Promise<DepositStats> =>
    apiGet<BackendDepositStats>('/api/v1/reports/deposits/stats')
      .then(transformDepositStats),

  getDepositMix: (): Promise<DepositMixItem[]> =>
    apiGet<BackendDepositMixEntry[]>('/api/v1/reports/deposits/mix')
      .then(transformDepositMix),

  getDepositGrowthTrend: (): Promise<DepositGrowthPoint[]> =>
    apiGet<BackendDepositGrowthEntry[]>('/api/v1/reports/deposits/growth-trend')
      .then(transformDepositGrowth),

  getTopDepositors: (): Promise<TopDepositor[]> =>
    apiGet<BackendTopDepositor[]>('/api/v1/reports/deposits/top-depositors')
      .then(transformTopDepositors),

  getMaturityProfile: (): Promise<MaturityBucket[]> =>
    apiGet<BackendMaturityBucket[]>('/api/v1/reports/deposits/maturity-profile')
      .then(transformMaturityProfile),

  getRateBands: (): Promise<RateBand[]> =>
    apiGet<BackendRateBandEntry[]>('/api/v1/reports/deposits/rate-bands')
      .then(transformRateBands),

  getRateSensitivityData: (): Promise<RateSensitivityPoint[]> =>
    apiGet<BackendRateSensitivityEntry[]>('/api/v1/reports/deposits/rate-sensitivity')
      .then(transformRateSensitivity),

  getCostOfFundsTrend: (): Promise<CostOfFundsPoint[]> =>
    apiGet<BackendCostOfFundsEntry[]>('/api/v1/reports/deposits/cost-of-funds')
      .then(transformCostOfFunds),

  getRetentionVintage: (): Promise<RetentionVintage[]> =>
    apiGet<BackendRetentionVintageEntry[]>('/api/v1/reports/deposits/retention-vintage')
      .then(transformRetentionVintage),

  getChurnAnalysis: (): Promise<ChurnStat> =>
    apiGet<BackendDepositChurnEntry[]>('/api/v1/reports/deposits/churn')
      .then(transformChurnAnalysis),

  getSegmentDistribution: (): Promise<DepositSegmentEntry[]> =>
    // Field names match exactly between backend DepositSegmentEntry and frontend DepositSegmentEntry
    apiGet<DepositSegmentEntry[]>('/api/v1/reports/deposits/segment-distribution'),
};
