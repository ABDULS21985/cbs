import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  name?: string;
  activeClients: number;
  totalPlans: number;
  [key: string]: unknown;
}

export interface WealthAdvisorDetail {
  advisorId: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  certifications: string[];
  activeClients: number;
  totalAum: number;
  [key: string]: unknown;
}

export interface WealthDocument {
  documentId: string;
  documentType: string;
  fileName: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  [key: string]: unknown;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const wealthApi = {
  // ── Plans ────────────────────────────────────────────────────────────────────
  listAll: () => apiGet<WealthManagementPlan[]>('/api/v1/wealth-management'),
  create: (data: Partial<WealthManagementPlan>) => apiPost<WealthManagementPlan>('/api/v1/wealth-management', data),
  getByCode: (code: string) => apiGet<WealthManagementPlan>(`/api/v1/wealth-management/${code}`),
  update: (code: string, data: Partial<WealthManagementPlan>) => apiPut<WealthManagementPlan>(`/api/v1/wealth-management/${code}`, data),
  activate: (code: string) => apiPost<WealthManagementPlan>(`/api/v1/wealth-management/${code}/activate`),
  close: (code: string) => apiPost<WealthManagementPlan>(`/api/v1/wealth-management/${code}/close`),
  getByCustomer: (customerId: number) => apiGet<WealthManagementPlan[]>(`/api/v1/wealth-management/customer/${customerId}`),
  getByAdvisor: (advisorId: string) => apiGet<WealthManagementPlan[]>(`/api/v1/wealth-management/advisor/${advisorId}`),

  // ── Plan Actions ─────────────────────────────────────────────────────────────
  assignAdvisor: (code: string, data: { advisorId: string }) =>
    apiPost<WealthManagementPlan>(`/api/v1/wealth-management/${code}/assign-advisor`, data),
  addGoal: (code: string, goal: Record<string, unknown>) =>
    apiPost<WealthManagementPlan>(`/api/v1/wealth-management/${code}/goals`, goal),
  rebalance: (code: string) =>
    apiPost<Record<string, unknown>>(`/api/v1/wealth-management/${code}/rebalance`),
  getPerformance: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/wealth-management/${code}/performance`),

  // ── Documents ────────────────────────────────────────────────────────────────
  getDocuments: (code: string) =>
    apiGet<WealthDocument[]>(`/api/v1/wealth-management/${code}/documents`),
  addDocument: (code: string, data: Record<string, unknown>) =>
    apiPost<WealthDocument>(`/api/v1/wealth-management/${code}/documents`, data),

  // ── Advisors ─────────────────────────────────────────────────────────────────
  listAdvisors: () => apiGet<WealthAdvisor[]>('/api/v1/wealth-management/advisors'),
  createAdvisor: (data: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>('/api/v1/wealth-management/advisors', data),
  getAdvisor: (id: string) =>
    apiGet<WealthAdvisorDetail>(`/api/v1/wealth-management/advisors/${id}`),
  getAdvisorPerformance: (id: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/wealth-management/advisors/${id}/performance`),
  getAdvisorClients: (id: string) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/wealth-management/advisors/${id}/clients`),
  getAdvisorReviews: (id: string) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/wealth-management/advisors/${id}/reviews`),
  addAdvisorReview: (id: string, data: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>(`/api/v1/wealth-management/advisors/${id}/reviews`, data),
  getAdvisorCertifications: (id: string) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/wealth-management/advisors/${id}/certifications`),

  // ── Analytics ────────────────────────────────────────────────────────────────
  getAumTrend: (months = 12) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/wealth-management/analytics/aum-trend`, { months }),
  getAumWaterfall: (period: string) =>
    apiGet<Record<string, unknown>[]>(`/api/v1/wealth-management/analytics/aum-waterfall`, { period }),
  getConcentrationRisk: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/concentration-risk'),
  getFlowAnalysis: (months = 12) =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/flow-analysis', { months }),
  getPerformanceAttribution: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/performance-attribution'),
  getClientSegments: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/client-segments'),
  getRiskHeatmap: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/risk-heatmap'),
  getFeeRevenue: (months = 12) =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/fee-revenue', { months }),
  getInsights: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/insights'),
};
