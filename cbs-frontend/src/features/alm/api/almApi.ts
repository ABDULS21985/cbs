import { apiGet, apiPost } from '@/lib/api';

export type ShockScenario =
  | 'PARALLEL_UP_200'
  | 'PARALLEL_DOWN_200'
  | 'STEEPENING'
  | 'FLATTENING';

export type BucketKey = '0-1M' | '1-3M' | '3-6M' | '6-12M' | '1-5Y' | '5Y+';

export interface GapBucket {
  bucket: BucketKey;
  assets: number;
  liabilities: number;
  gap: number;
  cumulativeGap: number;
  niiImpact?: number;
  eveImpact?: number;
}

export interface AlmGapReport {
  id: number;
  asOfDate: string;
  currency: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED';
  shockScenario: ShockScenario;
  buckets: GapBucket[];
  totalAssets: number;
  totalLiabilities: number;
  netGap: number;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface AlmScenario {
  id: number;
  name: string;
  type: string;
  shockBps: number;
  description: string;
  isRegulatory: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  requiredCapital?: number;
  computedImpact?: number;
  createdAt: string;
}

export interface AlmPosition {
  date: string;
  currency: string;
  assetsByBucket: Record<BucketKey, number>;
  liabilitiesByBucket: Record<BucketKey, number>;
  totalAssets: number;
  totalLiabilities: number;
  liquidityGap: number;
}

export interface DurationMetrics {
  portfolioCode: string;
  assetDuration: number;
  liabilityDuration: number;
  durationGap: number;
  modifiedDurationAssets: number;
  modifiedDurationLiabilities: number;
  dv01: number;
  computedAt: string;
}

export const almApi = {
  // Gap Reports
  getGapReport: (date: string) =>
    apiGet<AlmGapReport>(`/api/v1/alm/gap-report/${date}`),

  generateGapReport: (payload: {
    asOfDate: string;
    currency: string;
    shockScenario: ShockScenario;
  }) => apiPost<AlmGapReport>('/api/v1/alm/gap-report', payload),

  approveGapReport: (id: number) =>
    apiPost<AlmGapReport>(`/api/v1/alm/gap-report/${id}/approve`),

  // Duration
  getPortfolioDuration: (portfolioCode: string) =>
    apiGet<DurationMetrics>(`/api/v1/alm/duration/${portfolioCode}`),

  // Scenarios
  getScenarios: () =>
    apiGet<AlmScenario[]>('/api/v1/alm/scenarios'),

  getRegulatoryScenarios: () =>
    apiGet<AlmScenario[]>('/api/v1/alm/scenarios/regulatory'),

  createScenario: (payload: {
    name: string;
    type: string;
    shockBps: number;
    description: string;
  }) => apiPost<AlmScenario>('/api/v1/alm/scenarios', payload),

  // Full ALM Positions
  getAlmPositions: (date: string, currency: string) =>
    apiGet<AlmPosition>(`/api/v1/alm-full/${date}/${currency}`),

  calculateAlmPosition: (payload: { asOfDate: string; currency: string }) =>
    apiPost<AlmPosition>('/api/v1/alm-full', payload),
};
