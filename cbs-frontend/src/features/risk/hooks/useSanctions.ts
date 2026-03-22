import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sanctionsApi } from '../api/sanctionsApi';
import type { MatchStatus } from '../types/sanctions';

export function useSanctionsStats() {
  return useQuery({
    queryKey: ['sanctions', 'stats'],
    queryFn: async () => (await sanctionsApi.getStats()).data.data,
    staleTime: 30_000,
  });
}

export function usePendingMatches(params?: { status?: MatchStatus; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['sanctions', 'matches', params],
    queryFn: async () => (await sanctionsApi.listMatches(params)).data.data,
    staleTime: 30_000,
  });
}

export function useSanctionsMatch(id: number | null) {
  return useQuery({
    queryKey: ['sanctions', 'match', id],
    queryFn: async () => (await sanctionsApi.getMatch(id!)).data.data,
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useWatchlists() {
  return useQuery({
    queryKey: ['sanctions', 'watchlists'],
    queryFn: async () => (await sanctionsApi.listWatchlists()).data.data,
    staleTime: 60_000,
  });
}

export function useConfirmHit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => { const res = await sanctionsApi.confirmHit(id); return res; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions'] });
    },
  });
}

export function useMarkFalsePositive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, justification, documentId }: { id: number; justification: string; documentId?: number }) => {
      const res = await sanctionsApi.markFalsePositive(id, justification, documentId);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions'] });
    },
  });
}

export function useRunBatchScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => { const res = await sanctionsApi.runBatchScreen(); return res; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions'] });
    },
  });
}

export function useForceUpdateWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => { const res = await sanctionsApi.forceUpdateWatchlist(id); return res; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanctions', 'watchlists'] });
    },
  });
}
