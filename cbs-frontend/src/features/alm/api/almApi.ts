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

/**
 * Aligns with the backend AlmGapReport entity fields (camelCase via Jackson).
 * Backend fields: id, reportDate, currencyCode, buckets, totalRsa, totalRsl,
 * cumulativeGap, gapRatio, niiBase, niiUp100bp, niiDown100bp, niiSensitivity,
 * eveBase, eveUp200bp, eveDown200bp, eveSensitivity, weightedAvgDurationAssets,
 * weightedAvgDurationLiabs, durationGap, status, generatedBy, approvedBy, createdAt
 */
export interface AlmGapReport {
  id: number;
  /** ISO date string — maps to backend `reportDate` */
  reportDate: string;
  /** 3-char currency code — maps to backend `currencyCode` */
  currencyCode: string;
  /** Time bucket data as JSONB list */
  buckets: GapBucket[];
  totalRsa: number;
  totalRsl: number;
  cumulativeGap: number;
  gapRatio: number;
  niiBase: number;
  niiUp100bp: number;
  niiDown100bp: number;
  niiSensitivity: number;
  eveBase: number;
  eveUp200bp: number;
  eveDown200bp: number;
  eveSensitivity: number;
  weightedAvgDurationAssets?: number;
  weightedAvgDurationLiabs?: number;
  durationGap?: number;
  /** 'DRAFT' | 'FINAL' */
  status: string;
  generatedBy?: string;
  approvedBy?: string;
  createdAt: string;
}

/**
 * Aligns with backend AlmScenario entity.
 * Backend fields: id, scenarioName, scenarioType, shiftBps (JSONB map),
 * description, isRegulatory, isActive, createdAt
 */
export interface AlmScenario {
  id: number;
  scenarioName: string;
  scenarioType: string;
  /** JSONB map of tenor -> bps */
  shiftBps: Record<string, number>;
  description: string;
  isRegulatory: boolean;
  isActive: boolean;
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

/**
 * Duration analytics response — mirrors the Map<String,Object> returned by
 * AlmService.calculateDurationAnalytics(). All keys are camelCase.
 */
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
  /** Backend returns 'liabilityKrd' */
  liabilityKrd: number;
  netKrd: number;
}

export const almApi = {
  // Gap Reports
  /** Returns List<AlmGapReport> — we take first item or empty array */
  getGapReportsByDate: (date: string) =>
    apiGet<AlmGapReport[]>(`/api/v1/alm/gap-report/${date}`),

  getGapReports: () =>
    apiGet<AlmGapReport[]>('/api/v1/alm/gap-report'),

  /**
   * Backend uses @RequestParam not @RequestBody for most fields.
   * The buckets array is @RequestBody.
   * We pass everything as query params + buckets in body.
   */
  generateGapReport: (params: {
    reportDate: string;
    currencyCode: string;
    totalRsa: number;
    totalRsl: number;
    buckets?: Array<Record<string, unknown>>;
    avgAssetDuration?: number;
    avgLiabDuration?: number;
  }) => {
    const { reportDate, currencyCode, totalRsa, totalRsl, avgAssetDuration, avgLiabDuration, buckets = [] } = params;
    const query = new URLSearchParams({
      reportDate,
      currencyCode,
      totalRsa: String(totalRsa),
      totalRsl: String(totalRsl),
      ...(avgAssetDuration !== undefined ? { avgAssetDuration: String(avgAssetDuration) } : {}),
      ...(avgLiabDuration !== undefined ? { avgLiabDuration: String(avgLiabDuration) } : {}),
    });
    return apiPost<AlmGapReport>(`/api/v1/alm/gap-report?${query}`, buckets);
  },

  approveGapReport: (id: number) =>
    apiPost<AlmGapReport>(`/api/v1/alm/gap-report/${id}/approve`),

  // Duration — returns Map<String,Object> cast as DurationAnalytics
  getDurationAnalytics: (portfolioCode: string, yieldRate = 5.0) =>
    apiGet<DurationAnalytics>(`/api/v1/alm/duration/${portfolioCode}`, { yieldRate }),

  // Scenarios
  getScenarios: () =>
    apiGet<AlmScenario[]>('/api/v1/alm/scenarios'),

  getRegulatoryScenarios: () =>
    apiGet<AlmScenario[]>('/api/v1/alm/scenarios/regulatory'),

  createScenario: (payload: {
    scenarioName: string;
    scenarioType: string;
    shiftBps: Record<string, number>;
    description: string;
    isRegulatory?: boolean;
  }) => apiPost<AlmScenario>('/api/v1/alm/scenarios', payload),

  // Full ALM Positions (returns array of rows, one per bucket)
  getAlmPositions: (date: string, currency: string) =>
    apiGet<AlmPositionRow[]>(`/api/v1/alm-full/${date}/${currency}`),

  calculateAlmPosition: (payload: AlmPositionRow) =>
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

  // Stress Test Run History (Audit Trail)
  getStressRuns: () =>
    apiGet<StressTestRunSummary[]>('/api/v1/alm/stress-runs'),

  getStressRunsByScenario: (scenarioId: number) =>
    apiGet<StressTestRunSummary[]>(`/api/v1/alm/stress-runs/scenario/${scenarioId}`),
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

/** Persisted stress test run — audit trail record */
export interface StressTestRunSummary {
  id: number;
  scenarioId: number;
  scenarioName: string;
  scenarioType: string;
  avgShockBps: number;
  niiImpact: number;
  eveImpact: number;
  cet1Before: number;
  cet1After: number;
  breachCount: number;
  runBy: string;
  runAt: string;
  createdAt: string;
}
