import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { dashboardApi } from '../api/dashboardApi';

// Dashboard stats from various CBS endpoints
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => {
      // Aggregate from multiple endpoints
      try {
        const [customers] = await Promise.allSettled([
          apiGet<any[]>('/api/v1/customers', { page: 0, size: 1 }),
        ]);
        return {
          totalCustomers: customers.status === 'fulfilled' ? (customers.value as any)?.totalElements || 0 : 0,
          totalDeposits: 0, // Would come from GL summary endpoint
          activeLoans: 0,
          nplRatio: 0,
          revenueMtd: 0,
        };
      } catch {
        return { totalCustomers: 0, totalDeposits: 0, activeLoans: 0, nplRatio: 0, revenueMtd: 0 };
      }
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useRecentTransactions() {
  return useQuery({
    queryKey: queryKeys.dashboard.recentTransactions,
    queryFn: () => apiGet<any[]>('/api/v1/payments', { page: 0, size: 10, sort: 'createdAt', direction: 'DESC' }).catch(() => []),
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
