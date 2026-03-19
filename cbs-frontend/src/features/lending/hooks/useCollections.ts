import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '../api/collectionsApi';

export function useCollectionStats() {
  return useQuery({
    queryKey: ['collections', 'stats'],
    queryFn: () => collectionsApi.getStats(),
  });
}

export function useDpdAging() {
  return useQuery({
    queryKey: ['collections', 'dpd-aging'],
    queryFn: () => collectionsApi.getDpdAging(),
  });
}

export function useCollectionCases(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['collections', 'cases', params],
    queryFn: () => collectionsApi.listCases(params),
  });
}

export function useDunningQueue(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['collections', 'dunning-queue', params],
    queryFn: () => collectionsApi.listDunningQueue(params),
  });
}

export function useWriteOffRequests(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['collections', 'write-off-requests', params],
    queryFn: () => collectionsApi.listWriteOffRequests(params),
  });
}

export function useRecovery(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['collections', 'recovery', params],
    queryFn: () => collectionsApi.listRecovery(params),
  });
}

export function useLogDunningOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome: string }) =>
      collectionsApi.logDunningOutcome(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'dunning-queue'] });
    },
  });
}

export function useSubmitWriteOffRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      loanNumber: string;
      amount: number;
      type: 'PARTIAL' | 'FULL';
      recoveryEfforts: string;
      justification: string;
    }) => collectionsApi.submitWriteOffRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'write-off-requests'] });
    },
  });
}

export function useRecordRecovery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      loanNumber: string;
      amount: number;
      date: string;
      agent: string;
      notes?: string;
    }) => collectionsApi.recordRecovery(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'recovery'] });
      queryClient.invalidateQueries({ queryKey: ['collections', 'stats'] });
    },
  });
}
