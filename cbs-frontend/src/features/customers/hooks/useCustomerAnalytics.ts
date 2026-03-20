import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../api/analyticsApi';

const KEYS = {
  profitability: (id: number) => ['customer', 'profitability', id] as const,
  churnRisk: (id: number) => ['customer', 'churn-risk', id] as const,
};

export function useCustomerProfitability(customerId: number) {
  return useQuery({
    queryKey: KEYS.profitability(customerId),
    queryFn: () => analyticsApi.getProfitability(customerId),
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

export function useChurnRisk(customerId: number) {
  return useQuery({
    queryKey: KEYS.churnRisk(customerId),
    queryFn: () => analyticsApi.getChurnRisk(customerId),
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

export function useBulkStatusChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerIds, targetStatus, reason }: { customerIds: number[]; targetStatus: string; reason?: string }) =>
      analyticsApi.bulkStatusChange(customerIds, targetStatus, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useBulkAssignRm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerIds, relationshipManager }: { customerIds: number[]; relationshipManager: string }) =>
      analyticsApi.bulkAssignRm(customerIds, relationshipManager),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useBulkAssignSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerIds, segmentCode }: { customerIds: number[]; segmentCode: string }) =>
      analyticsApi.bulkAssignSegment(customerIds, segmentCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
