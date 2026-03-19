import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collateralApi } from '../api/collateralApi';
import type { CollateralFilters } from '../types/collateral';

const KEYS = {
  list: (filters?: CollateralFilters) => ['collateral', filters] as const,
  item: (id: number) => ['collateral', id] as const,
  valuationHistory: (id: number) => ['collateral', id, 'valuation-history'] as const,
};

export function useCollateralList(filters?: CollateralFilters) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => collateralApi.list(filters),
  });
}

export function useCollateralItem(id: number) {
  return useQuery({
    queryKey: KEYS.item(id),
    queryFn: () => collateralApi.getById(id),
    enabled: !!id,
  });
}

export function useCollateralValuationHistory(id: number) {
  return useQuery({
    queryKey: KEYS.valuationHistory(id),
    queryFn: () => collateralApi.getValuationHistory(id),
    enabled: !!id,
  });
}

export function useRequestValuation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      collateralApi.requestValuation(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.valuationHistory(variables.id) });
    },
  });
}

export function useMarkPerfected() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => collateralApi.markPerfected(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: KEYS.item(id) });
      queryClient.invalidateQueries({ queryKey: ['collateral'] });
    },
  });
}

export function useReleaseCollateral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => collateralApi.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collateral'] });
    },
  });
}
