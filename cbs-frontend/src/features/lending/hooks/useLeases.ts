import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leaseApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leases'] }),
  });
}

export function useActivateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leaseNumber: string) => leaseApi.activate(leaseNumber),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leases'] }),
  });
}

export function useDepreciateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leaseNumber: string) => leaseApi.depreciate(leaseNumber),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leases'] }),
  });
}

export function useExercisePurchaseOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leaseNumber: string) => leaseApi.exercisePurchaseOption(leaseNumber),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leases'] }),
  });
}

export function useEarlyTerminateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leaseNumber: string) => leaseApi.earlyTerminate(leaseNumber),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leases'] }),
  });
}
