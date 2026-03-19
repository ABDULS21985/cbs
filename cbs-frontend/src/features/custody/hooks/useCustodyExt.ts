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
    movements: (positionId: number) => ['custody', 'positions', positionId, 'movements'] as const,
  },
  fails: {
    all: ['custody', 'fails'] as const,
    dashboard: (params?: Record<string, unknown>) =>
      ['custody', 'fails', 'dashboard', params] as const,
    counterpartyReport: (params?: Record<string, unknown>) =>
      ['custody', 'fails', 'counterparty-report', params] as const,
  },
  valuations: {
    all: ['custody', 'valuations'] as const,
    models: (params?: Record<string, unknown>) =>
      ['custody', 'valuations', 'models', params] as const,
    model: (code: string) => ['custody', 'valuations', 'model', code] as const,
    summary: (ref: string) => ['custody', 'valuations', 'run', ref, 'summary'] as const,
    exceptions: (ref: string) => ['custody', 'valuations', 'run', ref, 'exceptions'] as const,
  },
  counterparties: {
    all: ['custody', 'counterparties'] as const,
    byType: (type: string) => ['custody', 'counterparties', 'type', type] as const,
    pendingKyc: (params?: Record<string, unknown>) =>
      ['custody', 'counterparties', 'pending-kyc', params] as const,
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

export function useSecuritiesMovements(positionId: number) {
  return useQuery({
    queryKey: KEYS.positions.movements(positionId),
    queryFn: () => securitiesPositionsApi.getMovements(positionId),
    enabled: !!positionId,
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

export function useSecuritiesFailsDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.fails.dashboard(params),
    queryFn: () => securitiesFailsApi.dashboard(params),
    staleTime: 30_000,
  });
}

export function useSecuritiesFailsCounterpartyReport(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.fails.counterpartyReport(params),
    queryFn: () => securitiesFailsApi.counterpartyReport(params),
    staleTime: 30_000,
  });
}

export function useEscalateSecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => securitiesFailsApi.escalate(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.all });
    },
  });
}

export function useBuyInSecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => securitiesFailsApi.buyIn(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.all });
    },
  });
}

export function usePenaltySecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => securitiesFailsApi.penalty(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.all });
    },
  });
}

export function useResolveSecuritiesFail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => securitiesFailsApi.resolve(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.fails.all });
    },
  });
}

// ─── Valuations ──────────────────────────────────────────────────────────────

export function useValuationModels(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.valuations.models(params),
    queryFn: () => valuationsApi.getAllModels(params),
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
      qc.invalidateQueries({ queryKey: KEYS.valuations.all });
    },
  });
}

export function useRunValuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => valuationsApi.runValuation(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.valuations.all });
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
      qc.invalidateQueries({ queryKey: KEYS.valuations.all });
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

export function usePendingKycCounterparties(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.counterparties.pendingKyc(params),
    queryFn: () => counterpartiesApi.pendingKyc(params),
    staleTime: 30_000,
  });
}

export function useUpdateCounterpartyExposure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => counterpartiesApi.updateExposure(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.counterparties.all });
    },
  });
}

export function useVerifyCounterpartyKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => counterpartiesApi.verifyKyc(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.counterparties.all });
    },
  });
}
