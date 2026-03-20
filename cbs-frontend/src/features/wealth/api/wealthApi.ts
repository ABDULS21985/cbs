import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

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

export interface WealthPlan {
  id: number;
  planCode: string;
  customerId: string;
  customerName: string;
  planType: string;
  advisorId: string;
  advisorName: string;
  totalNetWorth: number;
  totalInvestableAssets: number;
  annualIncome: number;
  riskProfile: string;
  investmentHorizon: number;
  targetAllocation: Record<string, number>;
  currentAllocation: Record<string, number>;
  allocations: AssetAllocation[];
  goals: WealthGoal[];
  financialGoals: { name: string; target: number; current: number; onTrack: boolean }[];
  nextReviewDate: string;
  createdDate: string;
  activatedDate: string;
  lastReviewDate: string;
  status: string;
  ytdReturn: number;
  absoluteGain: number;
  benchmarkDiff: number;
}

export interface TrustAccount {
  id: number;
  trustCode: string;
  trustName: string;
  trustType: string;
  grantorCustomerId: number;
  grantorName: string;
  trusteeName: string;
  trusteeType: string;
  corpusValue: number;
  incomeYtd: number;
  distributionsYtd: number;
  beneficiaries: Beneficiary[];
  currency: string;
  inceptionDate: string;
  status: string;
}

export interface Advisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  clientCount: number;
  aum: number;
  avgReturn: number;
  joinDate: string;
  specializations: string[];
  revenue: number;
  satisfaction: number;
  status: string;
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

export interface PlanCreateRequest {
  customerId: string;
  planType: string;
  advisorId: string;
  riskProfile: string;
  investmentHorizon: number;
  netWorth: number;
  investableAssets: number;
  annualIncome: number;
  goals: WealthGoal[];
  allocations: AssetAllocation[];
}

export interface TrustCreateRequest {
  trustName: string;
  trustType: string;
  grantorCustomerId: number;
  trusteeName: string;
  trusteeType: string;
  corpusValue: number;
  currency: string;
  beneficiaries: Omit<Beneficiary, 'id'>[];
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

  recordDistribution: (code: string, amount: number, beneficiary: string): Promise<DistributionRecord> =>
    apiPost<DistributionRecord>(`/api/v1/trusts/${code}/distribute`, { amount, beneficiary }),

  getDistributions: (code: string): Promise<DistributionRecord[]> =>
    apiGet<DistributionRecord[]>(`/api/v1/trusts/${code}/distributions`),

  // ── Goals ──
  addGoal: (code: string, goal: Omit<WealthGoal, 'id'>): Promise<WealthGoal> =>
    apiPost<WealthGoal>(`/api/v1/wealth-management/${code}/goals`, goal),

  // ── Rebalance ──
  rebalancePlan: (code: string): Promise<{ message: string }> =>
    apiPost<{ message: string }>(`/api/v1/wealth-management/${code}/rebalance`),

  // ── Documents ──
  uploadDocument: (code: string, file: File): Promise<{ id: string; name: string; url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiPost<{ id: string; name: string; url: string }>(
      `/api/v1/wealth-management/${code}/documents`,
      formData
    );
  },

  getDocuments: (code: string): Promise<{ id: string; name: string; type: string; uploadedBy: string; uploadDate: string; url: string }[]> =>
    apiGet<{ id: string; name: string; type: string; uploadedBy: string; uploadDate: string; url: string }[]>(
      `/api/v1/wealth-management/${code}/documents`
    ),
};
