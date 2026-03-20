import { apiGet, apiPost, apiPatch } from '@/lib/api';

export type ShockScenario =
  | 'PARALLEL_UP_200'
  | 'PARALLEL_DOWN_200'
  | 'STEEPENING'
  | 'FLATTENING';

export type ActionItemStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type PackStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'DISTRIBUTED';
export type RegulatoryReturnStatus = 'DRAFT' | 'VALIDATED' | 'SUBMITTED';

export interface AlcoActionItem {
  id: number;
  itemNumber: string;
  description: string;
  owner: string;
  dueDate: string;
  status: ActionItemStatus;
  updateNotes: string;
  meetingDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlcoPack {
  id: number;
  month: string;
  sections: string[];
  executiveSummary: string;
  status: PackStatus;
  preparedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  distributedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlcoPackVersion {
  id: number;
  packId: number;
  month: string;
  version: number;
  status: PackStatus;
  createdAt: string;
}

export interface RegulatoryReturn {
  id: number;
  code: string;
  name: string;
  frequency: 'DAILY' | 'MONTHLY' | 'QUARTERLY';
  dueDate: string;
  nextDue: string;
  status: RegulatoryReturnStatus;
  lastSubmissionDate?: string;
  lastSubmittedBy?: string;
  createdAt: string;
}

export interface RegulatoryReturnDetail extends RegulatoryReturn {
  data: Record<string, unknown>;
  validationErrors: ValidationError[];
  validationWarnings: ValidationError[];
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface RegulatorySubmission {
  id: number;
  returnId: number;
  returnCode: string;
  submissionDate: string;
  submittedBy: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  referenceNumber: string;
  createdAt: string;
}

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

/** Mirrors backend AlmPosition entity — one record per time bucket */
export interface AlmPositionRow {
  id: number;
  positionDate: string;
  currency: string;
  timeBucket: string;
  cashAndEquivalents: number;
  interbankPlacements: number;
  securitiesHeld: number;
  loansAndAdvances: number;
  fixedAssets: number;
  otherAssets: number;
  totalAssets: number;
  demandDeposits: number;
  termDeposits: number;
  interbankBorrowings: number;
  bondsIssued: number;
  otherLiabilities: number;
  totalLiabilities: number;
  gapAmount: number;
  cumulativeGap: number;
  gapRatio: number;
  niiImpactUp100bp: number;
  niiImpactDown100bp: number;
  eveImpactUp200bp: number;
  eveImpactDown200bp: number;
  durationAssets: number;
  durationLiabilities: number;
  durationGap: number;
  createdAt: string;
}

/** Legacy aggregated type kept for backward compat */
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

export interface Dv01LadderRow {
  bucket: string;
  notional: number;
  duration: number;
  dv01: number;
  pctOfTotal: number;
  kr1Y: number;
  kr2Y: number;
  kr5Y: number;
  kr10Y: number;
}

export interface KeyRateDurationPoint {
  tenor: string;
  assetKrd: number;
  liabilityKrd: number;
  netKrd: number;
}

export interface DurationAnalytics {
  portfolioCode: string;
  macaulayDurationAssets: number;
  modifiedDurationAssets: number;
  modifiedDurationLiabilities: number;
  durationGap: number;
  dv01: number;
  totalAssetValue: number;
  totalLiabValue: number;
  dv01Ladder: Dv01LadderRow[];
  keyRateDurations: KeyRateDurationPoint[];
  computedAt: string;
}

export const almApi = {
  // Gap Reports
  getGapReport: (date: string) =>
    apiGet<AlmGapReport>(`/api/v1/alm/gap-report/${date}`),

  getGapReports: () =>
    apiGet<AlmGapReport[]>('/api/v1/alm/gap-report'),

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

  getDurationAnalytics: (portfolioCode: string) =>
    apiGet<DurationAnalytics>(`/api/v1/alm/duration/${portfolioCode}`),

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

  // Full ALM Positions (returns array of rows, one per bucket)
  getAlmPositions: (date: string, currency: string) =>
    apiGet<AlmPositionRow[]>(`/api/v1/alm-full/${date}/${currency}`),

  calculateAlmPosition: (payload: { asOfDate: string; currency: string }) =>
    apiPost<AlmPositionRow>('/api/v1/alm-full', payload),

  // ALCO Pack
  getAlcoPacks: () =>
    apiGet<AlcoPack[]>('/api/v1/alm/alco-packs'),

  getAlcoPack: (id: number) =>
    apiGet<AlcoPack>(`/api/v1/alm/alco-packs/${id}`),

  getAlcoPackByMonth: (month: string) =>
    apiGet<AlcoPack>(`/api/v1/alm/alco-packs/month/${month}`),

  createAlcoPack: (payload: { month: string; sections: string[]; executiveSummary: string }) =>
    apiPost<AlcoPack>('/api/v1/alm/alco-packs', payload),

  updateAlcoPack: (id: number, payload: { sections: string[]; executiveSummary: string }) =>
    apiPatch<AlcoPack>(`/api/v1/alm/alco-packs/${id}`, payload),

  submitAlcoPackForReview: (id: number) =>
    apiPost<AlcoPack>(`/api/v1/alm/alco-packs/${id}/submit`),

  approveAlcoPack: (id: number) =>
    apiPost<AlcoPack>(`/api/v1/alm/alco-packs/${id}/approve`),

  distributeAlcoPack: (id: number) =>
    apiPost<AlcoPack>(`/api/v1/alm/alco-packs/${id}/distribute`),

  getAlcoPackVersions: (month: string) =>
    apiGet<AlcoPackVersion[]>(`/api/v1/alm/alco-packs/month/${month}/versions`),

  generateExecutiveSummary: (month: string) =>
    apiPost<{ summary: string }>(`/api/v1/alm/alco-packs/generate-summary`, { month }),

  // Action Items
  getActionItems: () =>
    apiGet<AlcoActionItem[]>('/api/v1/alm/action-items'),

  createActionItem: (payload: Omit<AlcoActionItem, 'id' | 'itemNumber' | 'createdAt' | 'updatedAt'>) =>
    apiPost<AlcoActionItem>('/api/v1/alm/action-items', payload),

  updateActionItemStatus: (id: number, payload: { status: ActionItemStatus; updateNotes?: string }) =>
    apiPatch<AlcoActionItem>(`/api/v1/alm/action-items/${id}`, payload),

  // Regulatory Returns
  getRegulatoryReturns: () =>
    apiGet<RegulatoryReturn[]>('/api/v1/alm/regulatory-returns'),

  getRegulatoryReturn: (id: number) =>
    apiGet<RegulatoryReturnDetail>(`/api/v1/alm/regulatory-returns/${id}`),

  validateReturn: (id: number) =>
    apiPost<{ errors: ValidationError[]; warnings: ValidationError[] }>(`/api/v1/alm/regulatory-returns/${id}/validate`),

  submitReturn: (id: number) =>
    apiPost<RegulatorySubmission>(`/api/v1/alm/regulatory-returns/${id}/submit`),

  getReturnSubmissions: (returnId: number) =>
    apiGet<RegulatorySubmission[]>(`/api/v1/alm/regulatory-returns/${returnId}/submissions`),

  getAllSubmissions: () =>
    apiGet<RegulatorySubmission[]>('/api/v1/alm/regulatory-submissions'),

  // Stress Testing
  runScenario: (scenarioId: number) =>
    apiPost<StressTestResult>(`/api/v1/alm/scenarios/${scenarioId}/run`),

  historicalReplay: (crisisName: string) =>
    apiGet<HistoricalReplayResult>(`/api/v1/alm/scenarios/historical/${crisisName}`),

  compareScenarios: (scenarioIds: number[]) =>
    apiPost<ScenarioComparison>('/api/v1/alm/scenarios/compare', scenarioIds),
};

// ── Stress Testing Types ────────────────────────────────────────────────────

export interface NiiWaterfallStep {
  step: string;
  value: number;
  cumulative: number;
}

export interface EveBreakdown {
  repricingRisk: number;
  basisRisk: number;
  optionRisk: number;
  yieldCurveRisk: number;
  totalImpact: number;
}

export interface CapitalAdequacy {
  cet1Before: number;
  cet1After: number;
  regulatoryMinimum: number;
  capitalImpactPct: number;
}

export interface LimitBreach {
  limit: string;
  threshold: string;
  actual: string;
  severity: 'HIGH' | 'CRITICAL' | 'WARNING';
}

export interface BalanceSheetPoint {
  month: number;
  assets: number;
  liabilities: number;
}

export interface StressTestResult {
  scenarioId: number;
  scenarioName: string;
  scenarioType: string;
  avgShockBps: number;
  niiWaterfall: NiiWaterfallStep[];
  eveBreakdown: EveBreakdown;
  capitalAdequacy: CapitalAdequacy;
  balanceSheetProjection: BalanceSheetPoint[];
  limitBreaches: LimitBreach[];
  niiImpact: number;
  eveImpact: number;
  runAt: string;
}

export interface HistoricalPathPoint {
  month: number;
  rateBps: number;
  monthlyPnl: number;
  cumulativePnl: number;
  nii: number;
}

export interface HistoricalReplayResult {
  crisisName: string;
  totalMonths: number;
  peakLoss: number;
  peakGain: number;
  finalPnl: number;
  path: HistoricalPathPoint[];
}

export interface ScenarioComparison {
  scenarios: StressTestResult[];
  comparedAt: string;
}
