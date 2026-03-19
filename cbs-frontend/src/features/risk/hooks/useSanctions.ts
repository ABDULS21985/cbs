import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sanctionsApi } from '../api/sanctionsApi';
import type { MatchStatus } from '../types/sanctions';

export function useSanctionsStats() {
  return useQuery({
    queryKey: ['sanctions', 'stats'],
    queryFn: () => sanctionsApi.getStats().then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function usePendingMatches(params?: { status?: MatchStatus; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['sanctions', 'matches', params],
    queryFn: () => sanctionsApi.listMatches(params).then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useSanctionsMatch(id: number | null) {
  return useQuery({
    queryKey: ['sanctions', 'match', id],
    queryFn: () => sanctionsApi.getMatch(id!).then((r) => r.data.data),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useWatchlists() {
  return useQuery({
    queryKey: ['sanctions', 'watchlists'],
    queryFn: () => sanctionsApi.listWatchlists().then((r) => r.data.data),
    staleTime: 60_000,
  });
}

export function useConfirmHit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sanctionsApi.confirmHit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions'] });
    },
  });
}

export function useMarkFalsePositive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, justification, documentId }: { id: number; justification: string; documentId?: number }) =>
      sanctionsApi.markFalsePositive(id, justification, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions'] });
    },
  });
}

export function useRunBatchScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sanctionsApi.runBatchScreen(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions'] });
    },
  });
}

export function useForceUpdateWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sanctionsApi.forceUpdateWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions', 'watchlists'] });
    },
  });
}
