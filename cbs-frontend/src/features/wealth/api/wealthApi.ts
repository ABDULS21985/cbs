import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WealthGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  monthlyContribution: number;
}

export interface AssetAllocation {
  assetClass: string;
  percentage: number;
  currentValue: number;
  targetPercentage: number;
}

export interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  sharePercent: number;
  contactInfo: string;
}

export interface DistributionRecord {
  id: string;
  date: string;
  amount: number;
  beneficiary: string;
  type: string;
  approvedBy: string;
}

/** Maps to backend WealthPlanResponse DTO */
export type WealthPlanStatus = 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'SUSPENDED' | 'CLOSED';
export type WealthPlanType = 'COMPREHENSIVE' | 'RETIREMENT' | 'ESTATE' | 'TAX' | 'EDUCATION' | 'SUCCESSION' | 'PHILANTHROPY';

export interface WealthPlan {
  id: number;
  planCode: string;
  customerId: string;
  customerName: string;
  planType: WealthPlanType;
  advisorId: string;
  advisorName: string;
  totalNetWorth: number;
  totalInvestableAssets: number;
  annualIncome: number;
  riskProfile: string;
  investmentHorizon: number;
  targetAllocation: Record<string, unknown>;
  currentAllocation: Record<string, unknown>;
  allocations: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  financialGoals: Record<string, unknown>[];
  nextReviewDate: string | null;
  createdDate: string | null;
  activatedDate: string | null;
  lastReviewDate: string | null;
  status: WealthPlanStatus;
  ytdReturn: number;
  absoluteGain: number;
  benchmarkDiff: number;
}

/** Maps to backend TrustAccount entity */
export type TrustStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'REVOKED';
export type TrustType = 'REVOCABLE' | 'IRREVOCABLE' | 'TESTAMENTARY' | 'CHARITABLE' | 'SPECIAL_NEEDS' | 'SPENDTHRIFT' | 'CONSTRUCTIVE' | 'PENSION_TRUST';
export type TrusteeType = 'BANK_SOLE' | 'BANK_CO' | 'INDIVIDUAL' | 'CORPORATE';

export interface TrustAccount {
  id: number;
  trustCode: string;
  trustName: string;
  trustType: TrustType;
  grantorCustomerId: number;
  trusteeName: string;
  trusteeType: TrusteeType;
  currency: string;
  corpusValue: number;
  incomeYtd: number;
  distributionsYtd: number;
  beneficiaries: Record<string, unknown>[];
  distributionRules: Record<string, unknown> | null;
  investmentPolicy: string | null;
  annualFeePct: number | null;
  taxId: string | null;
  status: TrustStatus;
  inceptionDate: string;
  terminationDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Derived from plans - not a persisted entity */
export interface Advisor {
  id: string;
  advisorId?: string;
  name: string;
  email: string;
  phone: string;
  clientCount: number;
  aum: number;
  avgReturn: number;
  totalPlans: number;
  status: string;
  // Detail endpoint only:
  specializations?: string[];
  joinDate?: string;
  // Frontend-computed (not from backend):
  revenue?: number;
  satisfaction?: number;
}

export interface AumDataPoint {
  month: string;
  aum: number;
  returns: number;
}

export interface PlanPerformance {
  planCode: string;
  ytdReturn: number;
  absoluteGain: number;
  benchmarkReturn: number;
  benchmarkDiff: number;
  monthlyReturns: { month: string; return: number }[];
}

/** Maps to backend WealthManagementPlan entity (POST body) */
export interface PlanCreateRequest {
  customerId: number;
  planType: WealthPlanType;
  advisorId?: string;
  customerName?: string;
  advisorName?: string;
  riskProfile?: string;
  investmentHorizon?: number;
  totalNetWorth?: number;
  totalInvestableAssets?: number;
  annualIncome?: number;
  financialGoals?: Record<string, unknown>[];
  allocations?: Record<string, unknown>[];
  targetAllocation?: Record<string, unknown>;
  taxBracketPct?: number;
  retirementTargetAge?: number;
  retirementIncomeGoal?: number;
  estatePlanSummary?: string;
  taxStrategy?: string;
  nextReviewDate?: string;
}

/** Maps to backend TrustAccount entity (POST body) */
export interface TrustCreateRequest {
  trustName: string;
  trustType: TrustType;
  grantorCustomerId: number;
  trusteeName: string;
  trusteeType: TrusteeType;
  currency?: string;
  corpusValue?: number;
  beneficiaries?: Record<string, unknown>[];
  distributionRules?: Record<string, unknown>;
  investmentPolicy?: string;
  annualFeePct?: number;
  taxId?: string;
  inceptionDate: string;
}

// ─── Advisor Performance Types ──────────────────────────────────────────────

export interface AdvisorPerformance {
  advisorId: string;
  monthlyReturns: { month: string; return: number; benchmark: number }[];
  clientRetentionRate: number;
  avgAlpha: number;
  aumByAssetClass: { month: string; equities: number; fixedIncome: number; alternatives: number; cash: number }[];
  satisfactionScores: { month: string; score: number }[];
}

export interface AdvisorClient {
  id: string;
  clientName: string;
  planCode: string;
  planType: string;
  aum: number;
  ytdReturn: number;
  lastReviewDate: string;
  goalStatus: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  riskProfile: string;
}

export interface AdvisorReview {
  id: string;
  clientName: string;
  planCode: string;
  dateTime: string;
  reviewType: 'ANNUAL_REVIEW' | 'MID_YEAR' | 'AD_HOC' | 'QUARTERLY_UPDATE' | 'REBALANCING';
  status: 'SCHEDULED' | 'CONFIRMED' | 'OVERDUE' | 'COMPLETED';
  notes?: string;
}

export interface AdvisorCertification {
  id: string;
  name: string;
  issuingBody: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

export interface ClientMatchRequest {
  aum: number;
  riskTolerance: string;
  goals: string[];
}

export interface ClientMatchResult {
  advisorId: string;
  advisorName: string;
  matchScore: number;
  reasons: string[];
}

// ─── Trust Beneficiary CRUD Types ───────────────────────────────────────────

export interface BeneficiaryCreateRequest {
  name: string;
  relationship: string;
  sharePercent: number;
  contactInfo: string;
}

export interface ScheduledDistribution {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  amount: number;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  nextDate: string;
  type: 'INCOME' | 'PRINCIPAL' | 'SPECIAL';
  status: 'ACTIVE' | 'PAUSED';
}

export interface TrustComplianceItem {
  id: string;
  name: string;
  type: 'DEED_REVIEW' | 'REGULATORY_FILING' | 'IPS_COMPLIANCE' | 'FEE_SCHEDULE';
  dueDate: string;
  status: 'COMPLIANT' | 'DUE_SOON' | 'OVERDUE' | 'PENDING';
  lastCompleted?: string;
}

export interface TrustDocument {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadDate: string;
  url: string;
}

// ─── Analytics Types (W4) ───────────────────────────────────────────────────

export interface AumWaterfallPoint {
  category: string;
  amount: number;
  type: 'increase' | 'decrease' | 'total';
}

/** Backend returns per-segment objects with nested trend arrays */
export interface AumSegmentPoint {
  segment: string;
  clientCount: number;
  totalAum: number;
  planCount: number;
  trend: { month: string; aum: number }[];
}

export interface ConcentrationRisk {
  customerId: number;
  clientName: string;
  totalAum: number;
  percentOfTotal: number;
  planCount: number;
}

export interface FlowAnalysisPoint {
  month: string;
  inflows: number;
  outflows: number;
  netFlow: number;
}

export interface PerformanceAttribution {
  advisorId: string;
  advisorName: string;
  aumManaged: number;
  clientCount: number;
  activePlans: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  sharpeRatio: number;
}

export interface ClientSegment {
  segment: string;
  count: number;
  totalAum: number;
  avgReturn: number;
}

export interface RiskHeatmapCell {
  assetClass: string;
  allocation: number;
  allocationPct: number;
  marketRisk: number;
  creditRisk: number;
  liquidityRisk: number;
  fxRisk: number;
  concentrationRisk: number;
  overallRisk: number;
}

export interface StressScenario {
  scenario: string;
  description: string;
  portfolioImpact: number;
  impactPct: number;
  affectedClients: number;
  recoveryMonths: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FeeRevenuePoint {
  month: string;
  advisoryFees: number;
  managementFees: number;
  performanceFees: number;
}

export interface PredictiveInsight {
  id: string;
  type: 'OPPORTUNITY' | 'RISK' | 'ACTION' | 'TREND';
  title: string;
  description: string;
  metric?: string;
  metricValue?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const wealthApi = {
  // ── Plans ──
  getPlans: (filters?: Record<string, unknown>): Promise<WealthPlan[]> =>
    apiGet<WealthPlan[]>('/api/v1/wealth-management', filters),

  getPlan: (code: string): Promise<WealthPlan> =>
    apiGet<WealthPlan>(`/api/v1/wealth-management/${code}`),

  createPlan: (data: PlanCreateRequest): Promise<WealthPlan> =>
    apiPost<WealthPlan>('/api/v1/wealth-management', data),

  updatePlan: (code: string, data: Partial<PlanCreateRequest>): Promise<WealthPlan> =>
    apiPut<WealthPlan>(`/api/v1/wealth-management/${code}`, data),

  activatePlan: (code: string): Promise<WealthPlan> =>
    apiPost<WealthPlan>(`/api/v1/wealth-management/${code}/activate`),

  closePlan: (code: string, reason: string): Promise<WealthPlan> =>
    apiPost<WealthPlan>(`/api/v1/wealth-management/${code}/close`, { reason }),

  // ── Advisors ──
  getAdvisors: (): Promise<Advisor[]> =>
    apiGet<Advisor[]>('/api/v1/wealth-management/advisors'),

  getAdvisor: (id: string): Promise<Advisor> =>
    apiGet<Advisor>(`/api/v1/wealth-management/advisors/${id}`),

  // ── Analytics ──
  getAumTrend: (months = 12): Promise<AumDataPoint[]> =>
    apiGet<AumDataPoint[]>('/api/v1/wealth-management/analytics/aum-trend', { months }),

  getPlanPerformance: (code: string): Promise<PlanPerformance> =>
    apiGet<PlanPerformance>(`/api/v1/wealth-management/${code}/performance`),

  // ── Trusts ──
  getTrusts: (filters?: Record<string, unknown>): Promise<TrustAccount[]> =>
    apiGet<TrustAccount[]>('/api/v1/trusts', filters),

  getTrust: (code: string): Promise<TrustAccount> =>
    apiGet<TrustAccount>(`/api/v1/trusts/${code}`),

  createTrust: (data: TrustCreateRequest): Promise<TrustAccount> =>
    apiPost<TrustAccount>('/api/v1/trusts', data),

  updateTrust: (code: string, data: Partial<TrustCreateRequest>): Promise<TrustAccount> =>
    apiPut<TrustAccount>(`/api/v1/trusts/${code}`, data),

  recordDistribution: (code: string, amount: number): Promise<TrustAccount> =>
    apiPost<TrustAccount>(`/api/v1/trusts/${code}/distribute?amount=${encodeURIComponent(amount)}`),

  getDistributions: (code: string): Promise<DistributionRecord[]> =>
    apiGet<DistributionRecord[]>(`/api/v1/trusts/${code}/distributions`),

  // ── Goals ──
  addGoal: (code: string, goal: Omit<WealthGoal, 'id'>): Promise<WealthGoal> =>
    apiPost<WealthGoal>(`/api/v1/wealth-management/${code}/goals`, goal),

  // ── Rebalance ──
  rebalancePlan: (code: string): Promise<{ message: string }> =>
    apiPost<{ message: string }>(`/api/v1/wealth-management/${code}/rebalance`),

  // ── Analytics ──
  getAnalyticsSummary: (): Promise<Record<string, unknown>> =>
    apiGet<Record<string, unknown>>('/api/v1/wealth-management/analytics/summary'),

  getAdvisorLeaderboard: (): Promise<Record<string, unknown>[]> =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/advisors'),

  // ── Advisor CRUD ──
  createAdvisor: (data: Record<string, unknown>): Promise<Record<string, unknown>> =>
    apiPost<Record<string, unknown>>('/api/v1/wealth-management/advisors', data),

  // ── Plan Documents ──
  // NOTE: Backend accepts JSON body (not multipart) for wealth plan documents
  uploadDocument: (code: string, file: File): Promise<{ id: string; name: string; planCode: string; uploadDate: string }> =>
    apiPost<{ id: string; name: string; planCode: string; uploadDate: string }>(
      `/api/v1/wealth-management/${code}/documents`,
      { name: file.name, type: file.type, size: file.size }
    ),

  getDocuments: (code: string): Promise<Record<string, unknown>[]> =>
    apiGet<Record<string, unknown>[]>(
      `/api/v1/wealth-management/${code}/documents`
    ),

  // ── Advisor Performance & Clients (W3) ──
  getAdvisorPerformance: (id: string): Promise<AdvisorPerformance> =>
    apiGet<AdvisorPerformance>(`/api/v1/wealth-management/advisors/${id}/performance`),

  getAdvisorClients: (id: string): Promise<AdvisorClient[]> =>
    apiGet<AdvisorClient[]>(`/api/v1/wealth-management/advisor/${id}`),

  assignAdvisor: (planCode: string, advisorId: string): Promise<WealthPlan> =>
    apiPost<WealthPlan>(`/api/v1/wealth-management/${planCode}/assign-advisor`, { advisorId }),

  getAdvisorReviews: (id: string): Promise<AdvisorReview[]> =>
    apiGet<AdvisorReview[]>(`/api/v1/wealth-management/advisors/${id}/reviews`),

  scheduleReview: (advisorId: string, data: Omit<AdvisorReview, 'id' | 'status'>): Promise<AdvisorReview> =>
    apiPost<AdvisorReview>(`/api/v1/wealth-management/advisors/${advisorId}/reviews`, data),

  getAdvisorCertifications: (id: string): Promise<AdvisorCertification[]> =>
    apiGet<AdvisorCertification[]>(`/api/v1/wealth-management/advisors/${id}/certifications`),

  matchClient: (data: ClientMatchRequest): Promise<ClientMatchResult[]> =>
    apiPost<ClientMatchResult[]>('/api/v1/wealth-management/advisors/match-client', data),

  // ── Trust Beneficiary CRUD (W3) ──
  addBeneficiary: (trustCode: string, data: BeneficiaryCreateRequest): Promise<Beneficiary> =>
    apiPost<Beneficiary>(`/api/v1/trusts/${trustCode}/beneficiaries`, data),

  updateBeneficiary: (trustCode: string, beneficiaryId: string, data: Partial<BeneficiaryCreateRequest>): Promise<Beneficiary> =>
    apiPut<Beneficiary>(`/api/v1/trusts/${trustCode}/beneficiaries/${beneficiaryId}`, data),

  removeBeneficiary: (trustCode: string, beneficiaryId: string): Promise<void> =>
    apiDelete<void>(`/api/v1/trusts/${trustCode}/beneficiaries/${beneficiaryId}`),

  // ── Trust Distributions (W3) ──
  getScheduledDistributions: (trustCode: string): Promise<ScheduledDistribution[]> =>
    apiGet<ScheduledDistribution[]>(`/api/v1/trusts/${trustCode}/scheduled-distributions`),

  scheduleDistribution: (trustCode: string, data: Omit<ScheduledDistribution, 'id' | 'status'>): Promise<ScheduledDistribution> =>
    apiPost<ScheduledDistribution>(`/api/v1/trusts/${trustCode}/scheduled-distributions`, data),

  // ── Trust Compliance (W3) ──
  getTrustCompliance: (trustCode: string): Promise<TrustComplianceItem[]> =>
    apiGet<TrustComplianceItem[]>(`/api/v1/trusts/${trustCode}/compliance`),

  // ── Analytics (W4) ──
  getAumWaterfall: (period?: string): Promise<AumWaterfallPoint[]> =>
    apiGet<AumWaterfallPoint[]>('/api/v1/wealth-management/analytics/aum-waterfall', { period }),

  getAumBySegment: (months?: number): Promise<AumSegmentPoint[]> =>
    apiGet<AumSegmentPoint[]>('/api/v1/wealth-management/analytics/aum-by-segment', { months }),

  getConcentrationRisk: (): Promise<ConcentrationRisk[]> =>
    apiGet<ConcentrationRisk[]>('/api/v1/wealth-management/analytics/concentration-risk'),

  getFlowAnalysis: (months?: number): Promise<FlowAnalysisPoint[]> =>
    apiGet<FlowAnalysisPoint[]>('/api/v1/wealth-management/analytics/flow-analysis', { months }),

  getPerformanceAttribution: (): Promise<PerformanceAttribution[]> =>
    apiGet<PerformanceAttribution[]>('/api/v1/wealth-management/analytics/performance-attribution'),

  getClientSegments: (): Promise<ClientSegment[]> =>
    apiGet<ClientSegment[]>('/api/v1/wealth-management/analytics/client-segments'),

  getRiskHeatmap: (): Promise<RiskHeatmapCell[]> =>
    apiGet<RiskHeatmapCell[]>('/api/v1/wealth-management/analytics/risk-heatmap'),

  getStressScenarios: (): Promise<StressScenario[]> =>
    apiGet<StressScenario[]>('/api/v1/wealth-management/analytics/stress-scenarios'),

  getFeeRevenue: (months?: number): Promise<FeeRevenuePoint[]> =>
    apiGet<FeeRevenuePoint[]>('/api/v1/wealth-management/analytics/fee-revenue', { months }),

  getPredictiveInsights: (): Promise<PredictiveInsight[]> =>
    apiGet<PredictiveInsight[]>('/api/v1/wealth-management/analytics/insights'),

  // ── Trust Documents ──
  getTrustDocuments: (trustCode: string): Promise<TrustDocument[]> =>
    apiGet<TrustDocument[]>(`/api/v1/trusts/${trustCode}/documents`),

  uploadTrustDocument: (trustCode: string, file: File): Promise<TrustDocument> =>
    apiUpload<TrustDocument>(`/api/v1/trusts/${trustCode}/documents`, file),

  deleteTrustDocument: (trustCode: string, docId: string): Promise<void> =>
    apiDelete<void>(`/api/v1/trusts/${trustCode}/documents/${docId}`),

  // ── Trust Analytics (W3) ──
  getTrustAnalytics: (): Promise<{
    distributionsByType: { type: string; amount: number }[];
    corpusGrowth: { month: string; revocable: number; irrevocable: number; testamentary: number; charitable: number }[];
    beneficiaryDistribution: { range: string; count: number }[];
    feeIncomeTrend: { month: string; feeIncome: number }[];
  }> =>
    apiGet('/api/v1/trusts/analytics'),
};
