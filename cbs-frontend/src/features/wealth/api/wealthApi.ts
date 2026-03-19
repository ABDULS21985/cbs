import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface WealthPlan {
  id: number; planCode: string; customerId: number; customerName: string;
  planType: string; advisorId: string; advisorName: string;
  totalNetWorth: number; totalInvestableAssets: number; annualIncome: number;
  riskProfile: string; investmentHorizon: string;
  targetAllocation: Record<string, number>;
  currentAllocation: Record<string, number>;
  financialGoals: { name: string; target: number; current: number; onTrack: boolean }[];
  nextReviewDate: string; status: string;
}

export interface TrustAccount {
  id: number; trustCode: string; trustName: string; trustType: string;
  grantorCustomerId: number; grantorName: string;
  trusteeName: string; trusteeType: string;
  corpusValue: number; incomeYtd: number; distributionsYtd: number;
  beneficiaries: { name: string; relationship: string; distributionPct: number }[];
  currency: string; inceptionDate: string; status: string;
}

export interface Advisor {
  id: string; name: string; clientCount: number; aum: number;
  revenue: number; avgReturn: number; satisfaction: number; status: string;
}

export const wealthApi = {
  getPlans: (filters?: Record<string, unknown>) => apiGet<WealthPlan[]>('/api/v1/wealth-management', filters),
  getPlan: (code: string) => apiGet<WealthPlan>(`/api/v1/wealth-management/${code}`),
  activatePlan: (code: string) => apiPost<WealthPlan>(`/api/v1/wealth-management/${code}/activate`),

  getTrusts: (filters?: Record<string, unknown>) => apiGet<TrustAccount[]>('/api/v1/trusts', filters),
  getTrust: (code: string) => apiGet<TrustAccount>(`/api/v1/trusts/${code}`),
  recordDistribution: (code: string, amount: number) => apiPost<TrustAccount>(`/api/v1/trusts/${code}/distribute`, null, ),

  getAdvisors: () => apiGet<Advisor[]>('/api/v1/wealth-management/advisors').catch(() => []),
};
