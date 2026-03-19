import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

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
