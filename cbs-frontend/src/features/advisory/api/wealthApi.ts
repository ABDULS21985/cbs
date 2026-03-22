import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WealthPlan {
  id: number;
  planCode: string;
  customerId: string;
  customerName?: string;
  planType: string;
  advisorId?: string;
  advisorName?: string;
  totalNetWorth?: number;
  totalInvestableAssets?: number;
  annualIncome?: number;
  riskProfile?: string;
  investmentHorizon?: number;
  targetAllocation?: Record<string, unknown>;
  currentAllocation?: Record<string, unknown>;
  allocations?: Record<string, unknown>[];
  goals?: Record<string, unknown>[];
  financialGoals?: Record<string, unknown>[];
  nextReviewDate?: string;
  createdDate?: string;
  activatedDate?: string;
  lastReviewDate?: string;
  status: string;
  ytdReturn: number;
  absoluteGain?: number;
  benchmarkDiff: number;
}

export interface CreateWealthPlanPayload {
  customerId: number;
  planType: string;
  customerName?: string;
  advisorId?: string;
  totalNetWorth?: number;
  totalInvestableAssets?: number;
  annualIncome?: number;
  riskProfile?: string;
  investmentHorizon?: number;
  taxBracketPct?: number;
  retirementTargetAge?: number;
  retirementIncomeGoal?: number;
  estatePlanSummary?: string;
  taxStrategy?: string;
  nextReviewDate?: string;
}

export interface WealthAdvisor {
  id: number;
  advisorCode: string;
  fullName: string;
  email: string;
  phone?: string;
  specializations?: string[];
  certifications?: Record<string, unknown>[];
  maxClients?: number;
  managementFeePct?: number;
  advisoryFeePct?: number;
  performanceFeePct?: number;
  joinDate?: string;
  status: string;
}

export interface AdvisorPerformance {
  advisorCode: string;
  advisorName: string;
  totalAum: number;
  clientCount: number;
  totalPlans: number;
  activePlans: number;
  totalFeesYtd: number;
  ytdReturn: number;
  benchmarkReturn: number;
  alpha: number;
  capacityUsed: number;
  maxClients: number;
}

export interface AumTrendPoint {
  month: string;
  aum: number;
  returns: number;
}

export interface WaterfallEntry {
  category: string;
  amount: number;
  type: 'increase' | 'decrease' | 'total';
}

export interface SegmentData {
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

export interface FlowEntry {
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

export interface RiskHeatmapRow {
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
  severity: string;
}

export interface FeeRevenueEntry {
  month: string;
  advisoryFees: number;
  managementFees: number;
  performanceFees: number;
  totalFees: number;
}

export interface WealthInsight {
  type: string;
  severity: string;
  title: string;
  description: string;
  metric: number;
  recommendation: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const wealthApi = {
  // ── Plans ─────────────────────────────────────────────────────────────────
  listPlans: () =>
    apiGet<WealthPlan[]>('/api/v1/wealth-management'),

  getPlan: (code: string) =>
    apiGet<WealthPlan>(`/api/v1/wealth-management/${code}`),

  createPlan: (payload: CreateWealthPlanPayload) =>
    apiPost<WealthPlan>('/api/v1/wealth-management', payload),

  updatePlan: (code: string, payload: Partial<CreateWealthPlanPayload>) =>
    apiPut<WealthPlan>(`/api/v1/wealth-management/${code}`, payload),

  activatePlan: (code: string) =>
    apiPost<WealthPlan>(`/api/v1/wealth-management/${code}/activate`),

  closePlan: (code: string) =>
    apiPost<WealthPlan>(`/api/v1/wealth-management/${code}/close`),

  assignAdvisor: (code: string, advisorId: string) =>
    apiPost<WealthPlan>(`/api/v1/wealth-management/${code}/assign-advisor`, { advisorId }),

  addGoal: (code: string, goal: Record<string, unknown>) =>
    apiPost<WealthPlan>(`/api/v1/wealth-management/${code}/goals`, goal),

  rebalance: (code: string) =>
    apiPost<{ planCode: string; message: string; status: string }>(`/api/v1/wealth-management/${code}/rebalance`),

  getPlanPerformance: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/wealth-management/${code}/performance`),

  getPlansByCustomer: (customerId: number) =>
    apiGet<WealthPlan[]>(`/api/v1/wealth-management/customer/${customerId}`),

  // ── Advisors ──────────────────────────────────────────────────────────────
  listAdvisors: () =>
    apiGet<WealthAdvisor[]>('/api/v1/wealth-management/advisors'),

  getAdvisor: (id: string) =>
    apiGet<WealthAdvisor>(`/api/v1/wealth-management/advisors/${id}`),

  createAdvisor: (data: Partial<WealthAdvisor>) =>
    apiPost<WealthAdvisor>('/api/v1/wealth-management/advisors', data),

  getAdvisorPerformance: (id: string) =>
    apiGet<AdvisorPerformance>(`/api/v1/wealth-management/advisors/${id}/performance`),

  getAdvisorClients: (id: string) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/wealth-management/advisors/${id}/clients`),

  getAdvisorReviews: (id: string) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/wealth-management/advisors/${id}/reviews`),

  scheduleReview: (id: string, data: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>(`/api/v1/wealth-management/advisors/${id}/reviews`, data),

  // ── Analytics ─────────────────────────────────────────────────────────────
  getAumTrend: (months = 12) =>
    apiGet<AumTrendPoint[]>('/api/v1/wealth-management/analytics/aum-trend', { months }),

  getAumWaterfall: (period = 'YTD') =>
    apiGet<WaterfallEntry[]>('/api/v1/wealth-management/analytics/aum-waterfall', { period }),

  getAumBySegment: (months = 24) =>
    apiGet<SegmentData[]>('/api/v1/wealth-management/analytics/aum-by-segment', { months }),

  getConcentrationRisk: () =>
    apiGet<ConcentrationRisk[]>('/api/v1/wealth-management/analytics/concentration-risk'),

  getFlowAnalysis: (months = 12) =>
    apiGet<FlowEntry[]>('/api/v1/wealth-management/analytics/flow-analysis', { months }),

  getPerformanceAttribution: () =>
    apiGet<PerformanceAttribution[]>('/api/v1/wealth-management/analytics/performance-attribution'),

  getClientSegments: () =>
    apiGet<{ segment: string; count: number; totalAum: number; avgReturn: number }[]>('/api/v1/wealth-management/analytics/client-segments'),

  getRiskHeatmap: () =>
    apiGet<RiskHeatmapRow[]>('/api/v1/wealth-management/analytics/risk-heatmap'),

  getStressScenarios: () =>
    apiGet<StressScenario[]>('/api/v1/wealth-management/analytics/stress-scenarios'),

  getFeeRevenue: (months = 12) =>
    apiGet<FeeRevenueEntry[]>('/api/v1/wealth-management/analytics/fee-revenue', { months }),

  getInsights: () =>
    apiGet<WealthInsight[]>('/api/v1/wealth-management/analytics/insights'),
};
