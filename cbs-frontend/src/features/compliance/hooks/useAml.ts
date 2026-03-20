import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amlApi } from '../api/amlApi';
import type { CreateAmlRulePayload, FileStrPayload } from '../types/aml';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const amlKeys = {
  all: ['aml'] as const,
  alerts: (params?: Record<string, unknown>) => ['aml', 'alerts', params] as const,
  alert: (id: number) => ['aml', 'alert', id] as const,
  rules: ['aml', 'rules'] as const,
  dashboard: ['aml', 'dashboard'] as const,
  stats: ['aml', 'stats'] as const,
  strs: (params?: Record<string, unknown>) => ['aml', 'strs', params] as const,
  ctrs: (params?: Record<string, unknown>) => ['aml', 'ctrs', params] as const,
  customerAlerts: (id: number) => ['aml', 'customer-alerts', id] as const,
} as const;

const DEFAULTS = { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } as const;

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useAmlAlerts(params?: { status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: amlKeys.alerts(params as Record<string, unknown>),
    queryFn: () => amlApi.getAlerts(params),
    ...DEFAULTS,
  });
}

export function useAmlAlert(id: number) {
  return useQuery({
    queryKey: amlKeys.alert(id),
    queryFn: () => amlApi.getAlert(id),
    enabled: !!id,
    ...DEFAULTS,
  });
}

export function useAmlActiveRules() {
  return useQuery({
    queryKey: amlKeys.rules,
    queryFn: () => amlApi.getActiveRules(),
    ...DEFAULTS,
  });
}

export function useAmlDashboard() {
  return useQuery({
    queryKey: amlKeys.dashboard,
    queryFn: () => amlApi.getDashboard(),
    ...DEFAULTS,
  });
}

export function useAmlStats() {
  return useQuery({
    queryKey: amlKeys.stats,
    queryFn: () => amlApi.getStats(),
    ...DEFAULTS,
  });
}

export function useAmlCustomerAlerts(customerId: number) {
  return useQuery({
    queryKey: amlKeys.customerAlerts(customerId),
    queryFn: () => amlApi.getCustomerAlerts(customerId),
    enabled: customerId > 0,
    ...DEFAULTS,
  });
}

export function useAmlStrs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: amlKeys.strs(params),
    queryFn: () => amlApi.getStrs(params),
    ...DEFAULTS,
  });
}

export function useAmlCtrs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: amlKeys.ctrs(params),
    queryFn: () => amlApi.getCtrs(params),
    ...DEFAULTS,
  });
}

export function useAmlAll(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...amlKeys.all, 'list', params],
    queryFn: () => amlApi.listAll(params),
    ...DEFAULTS,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useCreateAmlRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAmlRulePayload) => amlApi.createRule(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: amlKeys.rules }); },
  });
}

export function useToggleAmlRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => amlApi.toggleRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: amlKeys.rules }); },
  });
}

export function useAssignAmlAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: string }) =>
      amlApi.assignAlert(id, assignedTo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.all });
    },
  });
}

export function useEscalateAmlAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => amlApi.escalateAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.all });
      qc.invalidateQueries({ queryKey: amlKeys.dashboard });
    },
  });
}

export function useResolveAmlAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution, resolvedBy }: { id: number; resolution: string; resolvedBy: string }) =>
      amlApi.resolveAlert(id, { resolution, resolvedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.all });
      qc.invalidateQueries({ queryKey: amlKeys.dashboard });
      qc.invalidateQueries({ queryKey: amlKeys.stats });
    },
  });
}

export function useFileSar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sarReference, filedBy }: { id: number; sarReference: string; filedBy: string }) =>
      amlApi.fileSar(id, { sarReference, filedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.all });
      qc.invalidateQueries({ queryKey: amlKeys.dashboard });
    },
  });
}

export function useDismissAmlAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => amlApi.dismissAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.all });
      qc.invalidateQueries({ queryKey: amlKeys.dashboard });
    },
  });
}

export function useFileStr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FileStrPayload) => amlApi.fileStr(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: amlKeys.strs() });
    },
  });
}
