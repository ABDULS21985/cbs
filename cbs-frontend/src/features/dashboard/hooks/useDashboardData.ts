import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { dashboardApi } from '../api/dashboardApi';

/** GET /v1/dashboard/stats — real SQL aggregation of customer, account, loan, card, transaction KPIs */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => apiGet<{
      totalCustomers?: number;
      activeCustomers?: number;
      totalAccounts?: number;
      totalBalance?: number;
      totalDeposits?: number;
      totalLoans?: number;
      loanPortfolio?: number;
      nplAmount?: number;
      activeCards?: number;
      pendingTransactions?: number;
    }>('/api/v1/dashboard/stats'),
    staleTime: 60_000,
  });
}

/** GET /v1/dashboard/recent-transactions — last 20 transactions from payment_instruction */
export function useRecentTransactions() {
  return useQuery({
    queryKey: queryKeys.dashboard.recentTransactions,
    queryFn: () => apiGet<Array<{
      id: number;
      reference: string;
      amount: number;
      currency: string;
      type: string;
      status: string;
      createdAt: string;
    }>>('/api/v1/dashboard/recent-transactions'),
    staleTime: 30_000,
  });
}

// ─── New wired dashboard hooks ────────────────────────────────────────────────

export function useBankCashFlow() {
  return useQuery({
    queryKey: ['dashboard', 'bank-cashflow'],
    queryFn: () => dashboardApi.getBankCashFlow(),
    staleTime: 5 * 60_000,
  });
}

export function useTreasuryMetrics(currency = 'NGN') {
  return useQuery({
    queryKey: ['dashboard', 'treasury-metrics', currency],
    queryFn: () => dashboardApi.getTreasuryMetrics(currency),
    staleTime: 5 * 60_000,
  });
}

export function useComplianceAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'compliance-alerts'],
    queryFn: () => dashboardApi.getOverdueComplianceReports(),
    staleTime: 60_000,
  });
}

export function usePendingDocuments() {
  return useQuery({
    queryKey: ['dashboard', 'pending-documents'],
    queryFn: () => dashboardApi.getPendingDocuments(),
    staleTime: 60_000,
  });
}

export function useDashboardDealerDesks() {
  return useQuery({
    queryKey: ['dashboard', 'dealer-desks'],
    queryFn: () => dashboardApi.getDealerDesks(),
    staleTime: 30_000,
  });
}
