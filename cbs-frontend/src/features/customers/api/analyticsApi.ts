import { apiGet, apiPost } from '@/lib/api';

// ── Profitability Types ─────────────────────────────────────────────────────

export interface ProfitabilityData {
  customerId: number;
  interestIncome: number;
  feeIncome: number;
  fxIncome: number;
  otherIncome: number;
  totalRevenue: number;
  costOfFunds: number;
  operatingCost: number;
  provisions: number;
  otherCost: number;
  totalCost: number;
  netContribution: number;
  marginPct: number;
  lifetimeValue: number;
  tenureMonths: number;
  totalBalance: number;
  accountCount: number;
  monthlyTrend: { month: string; revenue: number }[];
  revenueBreakdown: { name: string; value: number }[];
}

// ── Churn Risk Types ────────────────────────────────────────────────────────

export interface ChurnRiskData {
  customerId: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: { factor: string; impact: string; direction: 'UP' | 'DOWN' }[];
  recommendedActions: { action: string; description: string }[];
}

// ── Bulk Operation Types ────────────────────────────────────────────────────

export interface BulkOperationResult {
  total: number;
  updated: number;
  failed: number;
  errors?: { customerId: number; error: string }[];
}

// ── API ─────────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getProfitability: (customerId: number) =>
    apiGet<ProfitabilityData>(`/api/v1/customers/${customerId}/profitability`),

  getChurnRisk: (customerId: number) =>
    apiGet<ChurnRiskData>(`/api/v1/customers/${customerId}/churn-risk`),

  bulkStatusChange: (customerIds: number[], targetStatus: string, reason?: string) =>
    apiPost<BulkOperationResult>('/api/v1/customers/bulk/status-change', { customerIds, targetStatus, reason }),

  bulkAssignRm: (customerIds: number[], relationshipManager: string) =>
    apiPost<BulkOperationResult>('/api/v1/customers/bulk/assign-rm', { customerIds, relationshipManager }),

  bulkAssignSegment: (customerIds: number[], segmentCode: string) =>
    apiPost<BulkOperationResult>('/api/v1/customers/bulk/assign-segment', { customerIds, segmentCode }),
};
