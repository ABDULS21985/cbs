import { apiGet, apiPost } from '@/lib/api';
import type { LoanProduct, LoanApplication, LoanAccount, RepaymentScheduleItem, LoanPayment, PortfolioStats, SettlementCalculation, LoanFilters } from '../types/loan';

export const loanApi = {
  // Products
  getProducts: () => apiGet<LoanProduct[]>('/api/v1/products?type=LOAN'),

  // Applications
  submitApplication: (data: Partial<LoanApplication>) => apiPost<LoanApplication>('/api/v1/loans/apply', data),
  getApplications: (filters?: LoanFilters) => apiGet<LoanApplication[]>('/api/v1/loans/applications', filters as Record<string, unknown>),
  getApplication: (id: number) => apiGet<LoanApplication>(`/api/v1/loans/applications/${id}`),
  approveApplication: (id: number, notes?: string) => apiPost<LoanApplication>(`/api/v1/loans/applications/${id}/approve`, { notes }),
  rejectApplication: (id: number, reason: string) => apiPost<LoanApplication>(`/api/v1/loans/applications/${id}/reject`, { reason }),

  // Active Loans
  getLoans: (filters?: LoanFilters) => apiGet<LoanAccount[]>('/api/v1/loans', filters as Record<string, unknown>),
  getLoan: (id: number) => apiGet<LoanAccount>(`/api/v1/loans/${id}`),
  getSchedule: (loanId: number) => apiGet<RepaymentScheduleItem[]>(`/api/v1/loans/${loanId}/schedule`),
  getPayments: (loanId: number) => apiGet<LoanPayment[]>(`/api/v1/loans/${loanId}/payments`),

  // Credit Scoring
  runCreditScore: (applicationId: number) => apiPost<{ score: number; rating: string; decision: string }>(`/api/v1/loans/credit-score`, { applicationId }),

  // Schedule Preview
  previewSchedule: (params: { amount: number; rate: number; tenor: number; method: string }) =>
    apiPost<RepaymentScheduleItem[]>('/api/v1/loans/schedule-preview', params),

  // Repayment
  recordPayment: (loanId: number, data: { amount: number; sourceAccountId: number; type: string }) =>
    apiPost<LoanPayment>(`/api/v1/loans/${loanId}/repay`, data),
  calculateSettlement: (loanId: number) =>
    apiGet<SettlementCalculation>(`/api/v1/loans/${loanId}/settlement-calculation`),

  // Restructuring
  submitRestructure: (loanId: number, data: Record<string, unknown>) =>
    apiPost<LoanAccount>(`/api/v1/loans/${loanId}/restructure`, data),

  // Portfolio
  getPortfolioStats: () => apiGet<PortfolioStats>('/api/v1/loans/portfolio/stats'),

  // Customer exposure
  getCustomerExposure: (customerId: number) =>
    apiGet<{ totalExposure: number; activeLoans: number; delinquentLoans: number }>(`/api/v1/customers/${customerId}/exposure`),
};
