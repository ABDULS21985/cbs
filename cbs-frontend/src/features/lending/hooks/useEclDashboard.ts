import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eclApi } from '../api/eclApi';
import type {
  EclSummary,
  StageDistributionItem,
  StageMigration,
  ProvisionMovementRow,
  PdTermStructure,
  LgdByCollateral,
  EadByProduct,
  GlReconciliation,
  MacroScenario,
  EclLoan,
} from '../types/ecl';

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
  return useQuery<EclSummary>({
    queryKey: ECL_KEYS.summary,
    queryFn: async () => {
      const r = await eclApi.getSummary();
      return r.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStageDistribution() {
  return useQuery<StageDistributionItem[]>({
    queryKey: ECL_KEYS.stageDistribution,
    queryFn: async () => {
      const r = await eclApi.getStageDistribution();
      return r.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useStageMigration() {
  return useQuery<StageMigration[]>({
    queryKey: ECL_KEYS.stageMigration,
    queryFn: async () => {
      const r = await eclApi.getStageMigration();
      return r.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProvisionMovement() {
  return useQuery<ProvisionMovementRow[]>({
    queryKey: ECL_KEYS.provisionMovement,
    queryFn: async () => {
      const r = await eclApi.getProvisionMovement();
      return r.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePdTermStructure() {
  return useQuery<PdTermStructure[]>({
    queryKey: ECL_KEYS.pdTermStructure,
    queryFn: async () => {
      const r = await eclApi.getPdTermStructure();
      return r.data.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useLgdByCollateral() {
  return useQuery<LgdByCollateral[]>({
    queryKey: ECL_KEYS.lgdByCollateral,
    queryFn: async () => {
      const r = await eclApi.getLgdByCollateral();
      return r.data.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useEadByProduct() {
  return useQuery<EadByProduct[]>({
    queryKey: ECL_KEYS.eadByProduct,
    queryFn: async () => {
      const r = await eclApi.getEadByProduct();
      return r.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useGlReconciliation() {
  return useQuery<GlReconciliation>({
    queryKey: ECL_KEYS.glReconciliation,
    queryFn: async () => {
      const r = await eclApi.getGlReconciliation();
      return r.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMacroScenarios() {
  return useQuery<MacroScenario[]>({
    queryKey: ECL_KEYS.macroScenarios,
    queryFn: async () => {
      const r = await eclApi.getMacroScenarios();
      return r.data.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useLoansByStage(stage: 1 | 2 | 3, enabled: boolean) {
  return useQuery<{ items: EclLoan[] }>({
    queryKey: ECL_KEYS.loansByStage(stage),
    queryFn: async () => {
      const r = await eclApi.getLoansByStage(stage);
      return r.data.data;
    },
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
    mutationFn: async (params: Record<string, unknown>) =>
      eclApi.calculate(params as Parameters<typeof eclApi.calculate>[0]),
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
    mutationFn: async () => {
      const r = await eclApi.runCalculation();
      return r.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecl'] });
    },
  });
}
