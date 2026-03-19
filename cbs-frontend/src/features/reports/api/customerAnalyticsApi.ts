import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── API Object ───────────────────────────────────────────────────────────────

export const customerAnalyticsApi = {
  getStats: (params: DateRangeParams): Promise<CustomerStats> =>
    apiGet<CustomerStats>('/v1/reports/customers/stats', params as unknown as Record<string, unknown>),

  getAcquisitionFunnel: (params: DateRangeParams): Promise<FunnelStep[]> =>
    apiGet<FunnelStep[]>('/v1/reports/customers/funnel', params as unknown as Record<string, unknown>),

  getGrowthTrend: (params: DateRangeParams): Promise<GrowthPoint[]> =>
    apiGet<GrowthPoint[]>('/v1/reports/customers/growth-trend', params as unknown as Record<string, unknown>),

  getLifecycleDistribution: (params: DateRangeParams): Promise<LifecycleSegment[]> =>
    apiGet<LifecycleSegment[]>('/v1/reports/customers/lifecycle', params as unknown as Record<string, unknown>),

  getSegmentProfitability: (params: DateRangeParams): Promise<SegmentProfitability[]> =>
    apiGet<SegmentProfitability[]>('/v1/reports/customers/segments', params as unknown as Record<string, unknown>),

  getChurnAnalysis: (params: DateRangeParams): Promise<{ trend: ChurnPoint[]; reasons: ChurnReason[] }> =>
    apiGet<{ trend: ChurnPoint[]; reasons: ChurnReason[] }>('/v1/reports/customers/churn', params as unknown as Record<string, unknown>),

  getAtRiskCustomers: (params: DateRangeParams): Promise<AtRiskCustomer[]> =>
    apiGet<AtRiskCustomer[]>('/v1/reports/customers/at-risk', params as unknown as Record<string, unknown>),

  getCrossSellMatrix: (params: DateRangeParams): Promise<CrossSellCell[]> =>
    apiGet<CrossSellCell[]>('/v1/reports/customers/cross-sell', params as unknown as Record<string, unknown>),

  getProductPenetration: (params: DateRangeParams): Promise<ProductPenetration[]> =>
    apiGet<ProductPenetration[]>('/v1/reports/customers/product-penetration', params as unknown as Record<string, unknown>),

  getLtvDistribution: (params: DateRangeParams): Promise<LtvBucket[]> =>
    apiGet<LtvBucket[]>('/v1/reports/customers/ltv', params as unknown as Record<string, unknown>),
};
