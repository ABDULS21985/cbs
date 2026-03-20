import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sanctionsApi } from '../api/sanctionsApi';
import type { ScreenNamePayload, BatchScreenPayload } from '../types/sanctions';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const sanctionsKeys = {
  all: ['sanctions'] as const,
  screenings: (params?: Record<string, unknown>) => ['sanctions', 'screenings', params] as const,
  pending: (params?: Record<string, unknown>) => ['sanctions', 'pending', params] as const,
  stats: ['sanctions', 'stats'] as const,
  matches: (params?: Record<string, unknown>) => ['sanctions', 'matches', params] as const,
  watchlists: (params?: Record<string, unknown>) => ['sanctions', 'watchlists', params] as const,
  batchJobs: (params?: Record<string, unknown>) => ['sanctions', 'batch-jobs', params] as const,
  matchDetail: (id: number) => ['sanctions', 'match', id] as const,
  batchJob: (id: string) => ['sanctions', 'batch-job', id] as const,
} as const;

const DEFAULTS = { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } as const;

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useSanctionsScreenings(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: sanctionsKeys.screenings(params),
    queryFn: () => sanctionsApi.listScreenings(params),
    ...DEFAULTS,
  });
}

export function useSanctionsPending(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: sanctionsKeys.pending(params),
    queryFn: () => sanctionsApi.getPendingReview(params),
    ...DEFAULTS,
  });
}

export function useSanctionsStats() {
  return useQuery({
    queryKey: sanctionsKeys.stats,
    queryFn: () => sanctionsApi.getStats(),
    ...DEFAULTS,
  });
}

export function useSanctionsWithMatches(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: sanctionsKeys.matches(params),
    queryFn: () => sanctionsApi.getScreeningsWithMatches(params),
    ...DEFAULTS,
  });
}

export function useWatchlists(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: sanctionsKeys.watchlists(params),
    queryFn: () => sanctionsApi.getWatchlists(params),
    ...DEFAULTS,
  });
}

export function useBatchScreenJobs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: sanctionsKeys.batchJobs(params),
    queryFn: () => sanctionsApi.getBatchScreenJobs(params),
    ...DEFAULTS,
  });
}

export function useMatchDetail(id: number) {
  return useQuery({
    queryKey: sanctionsKeys.matchDetail(id),
    queryFn: () => sanctionsApi.getMatchDetail(id),
    enabled: !!id,
    ...DEFAULTS,
  });
}

export function useBatchJobStatus(jobId: string) {
  return useQuery({
    queryKey: sanctionsKeys.batchJob(jobId),
    queryFn: () => sanctionsApi.getBatchJobStatus(jobId),
    enabled: !!jobId,
    ...DEFAULTS,
  });
}

export function useScreeningStatus() {
  return useQuery({
    queryKey: [...sanctionsKeys.all, 'status'],
    queryFn: () => sanctionsApi.getScreeningStatus(),
    ...DEFAULTS,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useScreenName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScreenNamePayload) => sanctionsApi.screenName(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sanctionsKeys.all });
    },
  });
}

export function useDisposeMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ screeningId, matchId, data }: {
      screeningId: number;
      matchId: number;
      data: { disposition: string; disposedBy: string; notes?: string };
    }) => sanctionsApi.disposeMatch(screeningId, matchId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sanctionsKeys.all });
    },
  });
}

export function useConfirmMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sanctionsApi.confirmMatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sanctionsKeys.all });
      qc.invalidateQueries({ queryKey: sanctionsKeys.stats });
    },
  });
}

export function useFalsePositiveMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sanctionsApi.falsePositiveMatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sanctionsKeys.all });
      qc.invalidateQueries({ queryKey: sanctionsKeys.stats });
    },
  });
}

export function useUpdateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sanctionsApi.updateWatchlist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sanctionsKeys.watchlists() });
    },
  });
}

export function useBatchScreen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BatchScreenPayload) => sanctionsApi.batchScreen(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sanctionsKeys.batchJobs() });
    },
  });
}
