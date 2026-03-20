import { apiGet, apiPost } from '@/lib/api';

export interface WealthManagementPlan {
  id: number;
  planCode: string;
  customerId: number;
  planType: string;
  advisorId: string | null;
  totalNetWorth: number | null;
  totalInvestableAssets: number | null;
  annualIncome: number | null;
  taxBracketPct: number | null;
  retirementTargetAge: number | null;
  retirementIncomeGoal: number | null;
  financialGoals: Record<string, unknown>[] | null;
  recommendedAllocation: Record<string, unknown> | null;
  insuranceNeeds: Record<string, unknown> | null;
  estatePlanSummary: string | null;
  taxStrategy: string | null;
  nextReviewDate: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WealthAdvisor {
  advisorId: string;
  activeClients: number;
  totalPlans: number;
}

export const wealthApi = {
  listAll: () => apiGet<WealthManagementPlan[]>('/api/v1/wealth-management'),
  create: (data: Partial<WealthManagementPlan>) => apiPost<WealthManagementPlan>('/api/v1/wealth-management', data),
  getByCode: (code: string) => apiGet<WealthManagementPlan>(`/api/v1/wealth-management/${code}`),
  activate: (code: string) => apiPost<WealthManagementPlan>(`/api/v1/wealth-management/${code}/activate`),
  getByCustomer: (customerId: number) => apiGet<WealthManagementPlan[]>(`/api/v1/wealth-management/customer/${customerId}`),
  getByAdvisor: (advisorId: string) => apiGet<WealthManagementPlan[]>(`/api/v1/wealth-management/advisor/${advisorId}`),
  listAdvisors: () => apiGet<WealthAdvisor[]>('/api/v1/wealth-management/advisors'),
};
