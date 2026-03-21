import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collateralApi } from '../api/collateralApi';
import type { CollateralFilters } from '../types/collateral';

const KEYS = {
  list: (filters?: CollateralFilters) => ['collateral', filters] as const,
  item: (id: number) => ['collateral', id] as const,
  valuationHistory: (id: number) => ['collateral', id, 'valuations'] as const,
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

export function useRegisterCollateral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => collateralApi.registerCollateral(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collateral'] });
    },
  });
}

// Backend: POST /{id}/valuations with CollateralValuationDto body
export function useAddValuation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      collateralApi.addValuation(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.valuationHistory(variables.id) });
      queryClient.invalidateQueries({ queryKey: KEYS.item(variables.id) });
    },
  });
}

// Backend: POST /{collateralId}/link/{loanAccountId}?allocatedValue=...
export function useLinkCollateralToLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collateralId, loanAccountId, allocatedValue }: { collateralId: number; loanAccountId: number; allocatedValue: number }) =>
      collateralApi.linkToLoan(collateralId, loanAccountId, allocatedValue),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.item(variables.collateralId) });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Backend: DELETE /{collateralId}/lien/{loanAccountId}
export function useUnlinkCollateralFromLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collateralId, loanAccountId }: { collateralId: number; loanAccountId: number }) =>
      collateralApi.unlinkFromLoan(collateralId, loanAccountId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.item(variables.collateralId) });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Backend: POST /loans/{loanId}/restructure
export function useRestructureLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, data }: { loanId: number; data: Record<string, unknown> }) =>
      collateralApi.restructureLoan(loanId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// Backend: GET /loans/{loanId}/restructure-history
export function useRestructureHistory(loanId: number) {
  return useQuery({
    queryKey: ['loans', loanId, 'restructure-history'],
    queryFn: () => collateralApi.getRestructureHistory(loanId),
    enabled: !!loanId,
  });
}
