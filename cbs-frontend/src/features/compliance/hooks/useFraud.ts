import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fraudApi } from '../api/fraudApi';
import type { ScoreTransactionPayload, CreateFraudRulePayload } from '../types/fraud';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const fraudKeys = {
  all: ['fraud'] as const,
  alerts: (params?: Record<string, unknown>) => ['fraud', 'alerts', params] as const,
  alert: (id: number) => ['fraud', 'alert', id] as const,
  rules: ['fraud', 'rules'] as const,
  stats: ['fraud', 'stats'] as const,
  trend: ['fraud', 'trend'] as const,
  modelPerformance: ['fraud', 'model-performance'] as const,
  alertTransactions: (id: number) => ['fraud', 'alert-transactions', id] as const,
} as const;

const DEFAULTS = { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } as const;

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useFraudAlerts(params?: { status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: fraudKeys.alerts(params as Record<string, unknown>),
    queryFn: () => fraudApi.getAlerts(params),
    ...DEFAULTS,
  });
}

export function useFraudAlert(id: number) {
  return useQuery({
    queryKey: fraudKeys.alert(id),
    queryFn: () => fraudApi.getAlert(id),
    enabled: !!id,
    ...DEFAULTS,
  });
}

export function useFraudActiveRules() {
  return useQuery({
    queryKey: fraudKeys.rules,
    queryFn: () => fraudApi.getActiveRules(),
    ...DEFAULTS,
  });
}

export function useFraudStats() {
  return useQuery({
    queryKey: fraudKeys.stats,
    queryFn: () => fraudApi.getStats(),
    ...DEFAULTS,
  });
}

export function useFraudTrend() {
  return useQuery({
    queryKey: fraudKeys.trend,
    queryFn: () => fraudApi.getTrend(),
    ...DEFAULTS,
  });
}

export function useFraudModelPerformance() {
  return useQuery({
    queryKey: fraudKeys.modelPerformance,
    queryFn: () => fraudApi.getModelPerformance(),
    ...DEFAULTS,
  });
}

export function useFraudAlertTransactions(alertId: number) {
  return useQuery({
    queryKey: fraudKeys.alertTransactions(alertId),
    queryFn: () => fraudApi.getAlertTransactions(alertId),
    enabled: !!alertId,
    ...DEFAULTS,
  });
}

export function useFraudAll(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...fraudKeys.all, 'list', params],
    queryFn: () => fraudApi.listAll(params),
    ...DEFAULTS,
  });
}

export function useFraudScoreStatus() {
  return useQuery({
    queryKey: [...fraudKeys.all, 'score-status'],
    queryFn: () => fraudApi.getScoreStatus(),
    ...DEFAULTS,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useScoreTransaction() {
  return useMutation({
    mutationFn: (data: ScoreTransactionPayload) => fraudApi.scoreTransaction(data),
  });
}

export function useCreateFraudRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFraudRulePayload) => fraudApi.createRule(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: fraudKeys.rules }); },
  });
}

export function useToggleFraudRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fraudApi.toggleRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: fraudKeys.rules }); },
  });
}

export function useAssignFraudAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: string }) =>
      fraudApi.assignAlert(id, assignedTo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fraudKeys.all });
    },
  });
}

export function useResolveFraudAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution, resolvedBy }: { id: number; resolution: string; resolvedBy: string }) =>
      fraudApi.resolveAlert(id, { resolution, resolvedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fraudKeys.all });
      qc.invalidateQueries({ queryKey: fraudKeys.stats });
    },
  });
}

export function useBlockCardFromFraud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.blockCard(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fraudKeys.all });
    },
  });
}

export function useBlockAccountFromFraud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.blockAccount(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fraudKeys.all });
    },
  });
}

export function useAllowTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.allowTransaction(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fraudKeys.all });
    },
  });
}

export function useDismissFraudAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.dismissAlert(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fraudKeys.all });
      qc.invalidateQueries({ queryKey: fraudKeys.stats });
    },
  });
}

export function useFileFraudCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: number) => fraudApi.fileCase(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: fraudKeys.all });
    },
  });
}
