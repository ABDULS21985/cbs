import { useQuery } from '@tanstack/react-query';
import { acquiringApi } from '../api/acquiringExtApi';
import { settlementsApi } from '../api/settlementApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  facilities: {
    all: ['acquiring', 'facilities'] as const,
    list: (params?: Record<string, unknown>) =>
      ['acquiring', 'facilities', 'list', params] as const,
  },
  settlements: {
    all: ['acquiring', 'settlements'] as const,
    list: (params?: Record<string, unknown>) =>
      ['acquiring', 'settlements', 'list', params] as const,
    instructions: (params?: Record<string, unknown>) =>
      ['acquiring', 'settlements', 'instructions', params] as const,
    batches: (params?: Record<string, unknown>) =>
      ['acquiring', 'settlements', 'batches', params] as const,
  },
} as const;

// ─── Acquiring Facilities ────────────────────────────────────────────────────

export function useAcquiringFacilities(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.facilities.list(params),
    queryFn: () => acquiringApi.listFacilities(params),
    staleTime: 30_000,
  });
}

export function useAcquiringSettlements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.settlements.list(params),
    queryFn: () => acquiringApi.listSettlements(params),
    staleTime: 30_000,
  });
}

// ─── Settlement Instructions & Batches ───────────────────────────────────────

export function useSettlementInstructions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.settlements.instructions(params),
    queryFn: () => settlementsApi.listInstructions(params),
    staleTime: 30_000,
  });
}

export function useSettlementBatches(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.settlements.batches(params),
    queryFn: () => settlementsApi.listBatches(params),
    staleTime: 30_000,
  });
}
