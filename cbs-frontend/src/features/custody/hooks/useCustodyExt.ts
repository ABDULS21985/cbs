import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securitiesPositionsApi } from '../api/securitiesPositionApi';
import { securitiesFailsApi } from '../api/securitiesFailApi';
import { valuationsApi } from '../api/valuationApi';
import { counterpartiesApi } from '../api/counterpartyApi';
import type { SecuritiesMovement } from '../types/securitiesPosition';
import type { ValuationModel, InstrumentValuation } from '../types/valuation';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  positions: {
    all: ['custody', 'positions'] as const,
    byPortfolio: (code: string) => ['custody', 'positions', 'portfolio', code] as const,
    movements: (positionId: string) => ['custody', 'positions', positionId, 'movements'] as const,
    allMovements: ['custody', 'positions', 'movements'] as const,
  },
  fails: {
    all: ['custody', 'fails'] as const,
    dashboard: ['custody', 'fails', 'dashboard'] as const,
    counterpartyReport: ['custody', 'fails', 'counterparty-report'] as const,
  },
  valuations: {
    all: ['custody', 'valuations'] as const,
    models: ['custody', 'valuations', 'models'] as const,
    model: (code: string) => ['custody', 'valuations', 'model', code] as const,
    runs: ['custody', 'valuations', 'runs'] as const,
    summary: (ref: string) => ['custody', 'valuations', 'run', ref, 'summary'] as const,
    exceptions: (ref: string) => ['custody', 'valuations', 'run', ref, 'exceptions'] as const,
  },
  counterparties: {
    all: ['custody', 'counterparties'] as const,
    byType: (type: string) => ['custody', 'counterparties', 'type', type] as const,
    pendingKyc: ['custody', 'counterparties', 'pending-kyc'] as const,
  },
} as const;

// ─── Securities Positions ────────────────────────────────────────────────────

export function useSecuritiesPositions(portfolioCode: string) {
  return useQuery({
    queryKey: KEYS.positions.byPortfolio(portfolioCode),
    queryFn: () => securitiesPositionsApi.getByPortfolio(portfolioCode),
    enabled: !!portfolioCode,
    staleTime: 30_000,
  });
}

export function useSecuritiesMovements(positionId: string) {
  return useQuery({
    queryKey: KEYS.positions.movements(positionId),
    queryFn: () => securitiesPositionsApi.getMovements(positionId),
    enabled: !!positionId,
    staleTime: 30_000,
  });
}

export function useAllSecuritiesMovements() {
  return useQuery({
    queryKey: KEYS.positions.allMovements,
    queryFn: () => securitiesPositionsApi.listMovements(),
    staleTime: 30_000,
  });
}

export function useRecordSecuritiesMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SecuritiesMovement>) =>
      securitiesPositionsApi.recordMovement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.positions.all });
    },
  });
}

// ─── Securities Fails ────────────────────────────────────────────────────────

export function useSecuritiesFailsDashboard() {
  return useQuery({
    queryKey: KEYS.fails.dashboard,
    queryFn: () => securitiesFailsApi.dashboard(),
    staleTime: 30_000,
  });
}

export function useSecuritiesFailsCounterpartyReport() {
  return useQuery({
    queryKey: KEYS.fails.counterpartyReport,
    queryFn: () => securitiesFailsApi.counterpartyReport(),
    staleTime: 30_000,
  });
}

export function useRecordSecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: securitiesFailsApi.recordFail,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.dashboard });
    },
  });
}

export function useEscalateSecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => securitiesFailsApi.escalate(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.dashboard });
    },
  });
}

export function useBuyInSecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => securitiesFailsApi.buyIn(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.dashboard });
    },
  });
}

// Backend: POST /{ref}/penalty?dailyRate=...
export function usePenaltySecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ref, dailyRate }: { ref: string; dailyRate: number }) =>
      securitiesFailsApi.penalty(ref, dailyRate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.dashboard });
    },
  });
}

// Backend: POST /{ref}/resolve?action=...&notes=...
export function useResolveSecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ref, action, notes }: { ref: string; action: string; notes?: string }) =>
      securitiesFailsApi.resolve(ref, action, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.dashboard });
    },
  });
}

// ─── Valuations ──────────────────────────────────────────────────────────────

export function useValuationModels() {
  return useQuery({
    queryKey: KEYS.valuations.models,
    queryFn: () => valuationsApi.getAllModels(),
    staleTime: 60_000,
  });
}

export function useValuationModel(code: string) {
  return useQuery({
    queryKey: KEYS.valuations.model(code),
    queryFn: () => valuationsApi.getModel(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useValuationRuns() {
  return useQuery({
    queryKey: KEYS.valuations.runs,
    queryFn: () => valuationsApi.getRuns(),
    staleTime: 30_000,
  });
}

export function useValuationRunSummary(ref: string) {
  return useQuery({
    queryKey: KEYS.valuations.summary(ref),
    queryFn: () => valuationsApi.getSummary(ref),
    enabled: !!ref,
    staleTime: 30_000,
  });
}

export function useValuationRunExceptions(ref: string) {
  return useQuery({
    queryKey: KEYS.valuations.exceptions(ref),
    queryFn: () => valuationsApi.getExceptions(ref),
    enabled: !!ref,
    staleTime: 30_000,
  });
}

export function useDefineValuationModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ValuationModel>) => valuationsApi.defineModel(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.valuations.models });
    },
  });
}

// Backend: POST /runs?modelId=...&date=...&runType=...
export function useRunValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelId, date, runType }: { modelId: number; date: string; runType: string }) =>
      valuationsApi.runValuation(modelId, date, runType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.valuations.runs });
    },
  });
}

export function useRecordInstrumentValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, data }: { ref: string; data: Partial<InstrumentValuation> }) =>
      valuationsApi.recordInstrument(ref, data),
    onSuccess: (_data, { ref }) => {
      qc.invalidateQueries({ queryKey: KEYS.valuations.summary(ref) });
      qc.invalidateQueries({ queryKey: KEYS.valuations.exceptions(ref) });
    },
  });
}

export function useCompleteValuationRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => valuationsApi.completeRun(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.valuations.runs });
    },
  });
}

// ─── Counterparties ──────────────────────────────────────────────────────────

export function useCounterpartiesByType(type: string) {
  return useQuery({
    queryKey: KEYS.counterparties.byType(type),
    queryFn: () => counterpartiesApi.byType(type),
    enabled: !!type,
    staleTime: 30_000,
  });
}

export function usePendingKycCounterparties() {
  return useQuery({
    queryKey: KEYS.counterparties.pendingKyc,
    queryFn: () => counterpartiesApi.pendingKyc(),
    staleTime: 30_000,
  });
}

export function useCreateCounterparty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof counterpartiesApi.create>[0]) =>
      counterpartiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.counterparties.all });
    },
  });
}

export function useUpdateCounterpartyExposure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, exposure }: { code: string; exposure: number }) =>
      counterpartiesApi.updateExposure(code, exposure),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.counterparties.all });
    },
  });
}

// Backend: POST /{code}/verify-kyc — no body, CBS_ADMIN only
export function useVerifyCounterpartyKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => counterpartiesApi.verifyKyc(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.counterparties.all });
      qc.invalidateQueries({ queryKey: KEYS.counterparties.pendingKyc });
    },
  });
}
