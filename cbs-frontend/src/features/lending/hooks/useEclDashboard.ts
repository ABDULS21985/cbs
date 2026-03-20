import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eclApi } from '../api/eclApi';

const ECL_KEYS = {
  summary: ['ecl', 'summary'] as const,
  stageDistribution: ['ecl', 'stage-distribution'] as const,
  stageMigration: ['ecl', 'stage-migration'] as const,
  provisionMovement: ['ecl', 'provision-movement'] as const,
  pdTermStructure: ['ecl', 'pd-term-structure'] as const,
  lgdByCollateral: ['ecl', 'lgd-by-collateral'] as const,
  eadByProduct: ['ecl', 'ead-by-product'] as const,
  glReconciliation: ['ecl', 'gl-reconciliation'] as const,
  macroScenarios: ['ecl', 'macro-scenarios'] as const,
  loansByStage: (stage: 1 | 2 | 3) => ['ecl', 'loans', stage] as const,
};

export function useEclSummary() {
  return useQuery({
    queryKey: ECL_KEYS.summary,
    queryFn: () => eclApi.getSummary().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStageDistribution() {
  return useQuery({
    queryKey: ECL_KEYS.stageDistribution,
    queryFn: () => eclApi.getStageDistribution().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStageMigration() {
  return useQuery({
    queryKey: ECL_KEYS.stageMigration,
    queryFn: () => eclApi.getStageMigration().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProvisionMovement() {
  return useQuery({
    queryKey: ECL_KEYS.provisionMovement,
    queryFn: () => eclApi.getProvisionMovement().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePdTermStructure() {
  return useQuery({
    queryKey: ECL_KEYS.pdTermStructure,
    queryFn: () => eclApi.getPdTermStructure().then((r) => r.data.data),
    staleTime: 30 * 60 * 1000,
  });
}

export function useLgdByCollateral() {
  return useQuery({
    queryKey: ECL_KEYS.lgdByCollateral,
    queryFn: () => eclApi.getLgdByCollateral().then((r) => r.data.data),
    staleTime: 30 * 60 * 1000,
  });
}

export function useEadByProduct() {
  return useQuery({
    queryKey: ECL_KEYS.eadByProduct,
    queryFn: () => eclApi.getEadByProduct().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGlReconciliation() {
  return useQuery({
    queryKey: ECL_KEYS.glReconciliation,
    queryFn: () => eclApi.getGlReconciliation().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMacroScenarios() {
  return useQuery({
    queryKey: ECL_KEYS.macroScenarios,
    queryFn: () => eclApi.getMacroScenarios().then((r) => r.data.data),
    staleTime: 30 * 60 * 1000,
  });
}

export function useLoansByStage(stage: 1 | 2 | 3, enabled: boolean) {
  return useQuery({
    queryKey: ECL_KEYS.loansByStage(stage),
    queryFn: () => eclApi.getLoansByStage(stage).then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useEclParameters() {
  return useQuery({
    queryKey: ['ecl', 'parameters'],
    queryFn: () => eclApi.listParameters(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveEclParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import('../types/eclExt').EclModelParameter>) =>
      eclApi.saveParameter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecl', 'parameters'] });
    },
  });
}

export function useCalculateEcl() {
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => eclApi.calculate(params),
  });
}

export function useEclCalculationsForDate(date: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['ecl', 'calculations', date, params],
    queryFn: () => eclApi.getCalculations(date, params),
    enabled: !!date,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRunEclCalculation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eclApi.runCalculation().then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecl'] });
    },
  });
}
