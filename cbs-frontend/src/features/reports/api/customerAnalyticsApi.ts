import { apiGet } from '@/lib/api';

// ─── Frontend Types (consumed by customer analytics components) ───────────────

export interface DateRangeParams {
  dateFrom: string;
  dateTo: string;
}

export interface CustomerStats {
  totalCustomers: number;
  newMtd: number;
  churnedMtd: number;
  netGrowth: number;
  avgProductsPerCustomer: number;
  crossSellRate: number;
  npsScore: number;
}

export interface FunnelStep {
  stage: string;
  count: number;
  conversionPct: number;
  dropOffReasons?: string[];
}

export interface GrowthPoint {
  month: string;
  newCustomers: number;
  churned: number;
  net: number;
}

export interface LifecycleSegment {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SegmentProfitability {
  segment: string;
  customers: number;
  avgBalance: number;
  avgRevenue: number;
  avgCost: number;
  netMargin: number;
  ltv: number;
}

export interface ChurnPoint {
  month: string;
  churnRate: number;
  target: number;
}

export interface ChurnReason {
  reason: string;
  percentage: number;
  color: string;
}

export interface AtRiskCustomer {
  id: string;
  name: string;
  segment: string;
  churnScore: number;
  lastActivity: string;
  balance: number;
  revenueAtRisk: number;
}

export interface CrossSellCell {
  fromProduct: string;
  toProduct: string;
  probability: number;
}

export interface ProductPenetration {
  product: string;
  penetrationPct: number;
  count: number;
}

export interface LtvBucket {
  range: string;
  count: number;
  percentage: number;
}

// ─── Backend Response Types ────────────────────────────────────────────────────

interface BackendCustomerStats {
  total: number;
  active: number;
  dormant: number;
  newMtd: number;
  closedMtd: number;
}

interface BackendFunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}

interface BackendCustomerChurnEntry {
  month: string;
  churned: number;
  churnRate: number;
}

interface BackendAtRiskCustomer {
  cifNumber: string;
  customerName: string;
  riskScore: number;
  reason: string;
}

interface BackendCrossSellOpportunity {
  product: string;
  eligibleCount: number;
  estimatedRevenue: number;
}

interface BackendProductPenetrationEntry {
  productsHeld: number;
  customerCount: number;
  percentage: number;
}

interface BackendLtvBucket {
  bucket: string;
  count: number;
  totalLtv: number;
}

// ─── Color palette ─────────────────────────────────────────────────────────────

const LIFECYCLE_COLORS = ['#16a34a', '#2563eb', '#0891b2', '#f59e0b', '#7c3aed', '#dc2626'];
const CHURN_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#0891b2', '#7c3aed'];
function colorAt(palette: string[], i: number) { return palette[i % palette.length]; }

// ─── Transformation Functions ──────────────────────────────────────────────────

function transformCustomerStats(raw: BackendCustomerStats): CustomerStats {
  const newMtd    = raw?.newMtd    ?? 0;
  const churnedMtd = raw?.closedMtd ?? 0;
  return {
    totalCustomers:         raw?.total    ?? 0,
    newMtd,
    churnedMtd,
    netGrowth:              newMtd - churnedMtd,
    avgProductsPerCustomer: 0,   // not in backend DTO
    crossSellRate:          0,
    npsScore:               0,
  };
}

function transformFunnel(entries: BackendFunnelStage[]): FunnelStep[] {
  return (entries ?? []).map((e) => ({
    stage:         e.stage ?? '',
    count:         e.count          ?? 0,
    conversionPct: e.conversionRate  ?? 0,
  }));
}

function transformChurnAnalysis(
  entries: BackendCustomerChurnEntry[],
): { trend: ChurnPoint[]; reasons: ChurnReason[] } {
  const trend = (entries ?? []).map((e) => ({
    month:     e.month     ?? '',
    churnRate: e.churnRate ?? 0,
    target:    5,              // default 5% target; not in backend DTO
  }));
  return { trend, reasons: [] };
}

function transformAtRiskCustomers(entries: BackendAtRiskCustomer[]): AtRiskCustomer[] {
  return (entries ?? []).map((e) => ({
    id:             e.cifNumber    ?? '',
    name:           e.customerName ?? '',
    segment:        '',              // not in backend DTO
    churnScore:     e.riskScore    ?? 0,
    lastActivity:   '',
    balance:        0,
    revenueAtRisk:  0,
  }));
}

function transformCrossSell(entries: BackendCrossSellOpportunity[]): CrossSellCell[] {
  // Backend returns product + eligibleCount; map to fromProduct=ALL, toProduct=product
  return (entries ?? []).map((e) => ({
    fromProduct: 'ALL',
    toProduct:   e.product      ?? '',
    probability: e.eligibleCount > 0 ? Math.min(100, (e.eligibleCount / 100)) : 0,
  }));
}

function transformProductPenetration(entries: BackendProductPenetrationEntry[]): ProductPenetration[] {
  return (entries ?? []).map((e) => ({
    product:       `${e.productsHeld ?? 0} product${(e.productsHeld ?? 0) !== 1 ? 's' : ''}`,
    penetrationPct: e.percentage    ?? 0,
    count:          e.customerCount ?? 0,
  }));
}

function transformLtvBuckets(entries: BackendLtvBucket[]): LtvBucket[] {
  const total = (entries ?? []).reduce((s, e) => s + (e.count ?? 0), 0);
  return (entries ?? []).map((e) => ({
    range:      e.bucket ?? '',
    count:      e.count  ?? 0,
    percentage: total > 0 ? ((e.count ?? 0) / total) * 100 : 0,
  }));
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const customerAnalyticsApi = {
  getStats: (params: DateRangeParams): Promise<CustomerStats> =>
    apiGet<BackendCustomerStats>('/api/v1/reports/customers/stats', params as unknown as Record<string, unknown>)
      .then(transformCustomerStats),

  getAcquisitionFunnel: (params: DateRangeParams): Promise<FunnelStep[]> =>
    apiGet<BackendFunnelStage[]>('/api/v1/reports/customers/funnel', params as unknown as Record<string, unknown>)
      .then(transformFunnel),

  getGrowthTrend: (params: DateRangeParams): Promise<GrowthPoint[]> =>
    // Backend returns CustomerGrowthEntryV2 (month, newCustomers, closedCustomers, netGrowth, totalCustomers)
    apiGet<Array<{ month: string; newCustomers: number; closedCustomers: number; netGrowth: number }>>('/api/v1/reports/customers/growth-trend', params as unknown as Record<string, unknown>)
      .then((entries) => (entries ?? []).map((e) => ({
        month:        e.month          ?? '',
        newCustomers: e.newCustomers   ?? 0,
        churned:      e.closedCustomers ?? 0,
        net:          e.netGrowth       ?? 0,
      }))),

  getLifecycleDistribution: (params: DateRangeParams): Promise<LifecycleSegment[]> =>
    // Backend returns {stage, count, percentage} — field names match
    apiGet<Array<{ stage: string; count: number; percentage: number }>>('/api/v1/reports/customers/lifecycle', params as unknown as Record<string, unknown>)
      .then((entries) => (entries ?? []).map((e, i) => ({
        stage:      e.stage      ?? '',
        count:      e.count      ?? 0,
        percentage: e.percentage ?? 0,
        color:      colorAt(LIFECYCLE_COLORS, i),
      }))),

  getSegmentProfitability: (params: DateRangeParams): Promise<SegmentProfitability[]> =>
    // Backend returns {segment, customers, avgBalance, avgRevenue, avgCost, netMargin, ltv} — field names match
    apiGet<SegmentProfitability[]>('/api/v1/reports/customers/segments', params as unknown as Record<string, unknown>),

  getChurnAnalysis: (params: DateRangeParams): Promise<{ trend: ChurnPoint[]; reasons: ChurnReason[] }> =>
    apiGet<BackendCustomerChurnEntry[]>('/api/v1/reports/customers/churn', params as unknown as Record<string, unknown>)
      .then(transformChurnAnalysis),

  getAtRiskCustomers: (params: DateRangeParams): Promise<AtRiskCustomer[]> =>
    apiGet<BackendAtRiskCustomer[]>('/api/v1/reports/customers/at-risk', params as unknown as Record<string, unknown>)
      .then(transformAtRiskCustomers),

  getCrossSellMatrix: (params: DateRangeParams): Promise<CrossSellCell[]> =>
    apiGet<BackendCrossSellOpportunity[]>('/api/v1/reports/customers/cross-sell', params as unknown as Record<string, unknown>)
      .then(transformCrossSell),

  getProductPenetration: (params: DateRangeParams): Promise<ProductPenetration[]> =>
    apiGet<BackendProductPenetrationEntry[]>('/api/v1/reports/customers/product-penetration', params as unknown as Record<string, unknown>)
      .then(transformProductPenetration),

  getLtvDistribution: (params: DateRangeParams): Promise<LtvBucket[]> =>
    apiGet<BackendLtvBucket[]>('/api/v1/reports/customers/ltv', params as unknown as Record<string, unknown>)
      .then(transformLtvBuckets),
};
