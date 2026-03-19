import { useQuery } from '@tanstack/react-query';
import { tradingApi } from '../api/tradingApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';

export function useTreasuryHomeData() {
  const deals = useQuery({
    queryKey: ['treasury-deals', 'list', { size: 5 }],
    queryFn: () => tradingApi.listDeals({ size: 5 }),
    staleTime: 30_000,
  });

  const desks = useQuery({
    queryKey: ['dealer-desks', 'list'],
    queryFn: () => tradingApi.listDealerDesks(),
    staleTime: 30_000,
  });

  const analytics = useQuery({
    queryKey: ['dashboard', 'treasury-metrics', 'NGN'],
    queryFn: () => dashboardApi.getTreasuryMetrics('NGN'),
    staleTime: 5 * 60_000,
  });

  const almScenarios = useQuery({
    queryKey: ['alm', 'scenarios'],
    queryFn: () => dashboardApi.getAlmScenarios(),
    staleTime: 5 * 60_000,
  });

  return { deals, desks, analytics, almScenarios };
}
