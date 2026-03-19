import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pfmApi } from '../api/pfmApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  pfm: {
    all: ['goals', 'pfm'] as const,
    history: (customerId: number) => ['goals', 'pfm', 'customer', customerId] as const,
    latest: (customerId: number) => ['goals', 'pfm', 'customer', customerId, 'latest'] as const,
  },
} as const;

// ─── PFM Snapshots ───────────────────────────────────────────────────────────

export function usePfmHistory(customerId: number) {
  return useQuery({
    queryKey: KEYS.pfm.history(customerId),
    queryFn: () => pfmApi.history(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function usePfmLatest(customerId: number) {
  return useQuery({
    queryKey: KEYS.pfm.latest(customerId),
    queryFn: () => pfmApi.latest(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useGeneratePfmSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: number) => pfmApi.generate(customerId),
    onSuccess: (_data, customerId) => {
      qc.invalidateQueries({ queryKey: KEYS.pfm.history(customerId) });
      qc.invalidateQueries({ queryKey: KEYS.pfm.latest(customerId) });
    },
  });
}
