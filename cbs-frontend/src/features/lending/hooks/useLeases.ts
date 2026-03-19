import { useQuery } from '@tanstack/react-query';
import { leaseApi } from '../api/leaseApi';

export function useLeaseList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['leases', 'list', params],
    queryFn: () => leaseApi.list(params),
  });
}

export function useLease(id: number) {
  return useQuery({
    queryKey: ['leases', id],
    queryFn: () => leaseApi.getById(id),
    enabled: !!id,
  });
}

export function useLeaseAmortization(id: number) {
  return useQuery({
    queryKey: ['leases', id, 'amortization'],
    queryFn: () => leaseApi.getAmortizationSchedule(id),
    enabled: !!id,
  });
}
