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

export function useRecovery() {
  return useQuery({
    queryKey: ['collections', 'recovery'],
    queryFn: () => collectionsApi.listRecovery(),
  });
}

export function useCollectionCase(id: number) {
  return useQuery({
    queryKey: ['collections', 'case', id],
    queryFn: () => collectionsApi.getCase(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useCreateCollectionCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loanAccountId: number) => collectionsApi.createCase(loanAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'cases'] });
      queryClient.invalidateQueries({ queryKey: ['collections', 'stats'] });
    },
  });
}

export function useBatchCreateCases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => collectionsApi.batchCreateCases(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useAssignCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, assignedTo, team }: { caseId: number; assignedTo: string; team?: string }) =>
      collectionsApi.assignCase(caseId, assignedTo, team),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['collections', 'cases'] });
    },
  });
}

export function useLogCollectionAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, action }: { caseId: number; action: Record<string, unknown> }) =>
      collectionsApi.logAction(caseId, action),
    onSuccess: (_data, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['collections', 'case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['collections', 'cases'] });
    },
  });
}

export function useCloseCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, resolutionType, resolutionAmount }: { caseId: number; resolutionType: string; resolutionAmount?: number }) =>
      collectionsApi.closeCase(caseId, resolutionType, resolutionAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useAgentCases(assignedTo: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['collections', 'agent-cases', assignedTo, params],
    queryFn: () => collectionsApi.getAgentCases(assignedTo, params),
    enabled: !!assignedTo,
  });
}
