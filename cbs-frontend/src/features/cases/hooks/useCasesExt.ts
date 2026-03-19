import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '../api/caseExtApi';
import { rootCauseAnalysisApi } from '../api/rootCauseApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  cases: {
    all: ['cases'] as const,
  },
  rootCause: {
    all: ['cases', 'root-cause'] as const,
    recurring: (params?: Record<string, unknown>) =>
      ['cases', 'root-cause', 'recurring', params] as const,
    dashboard: (params?: Record<string, unknown>) =>
      ['cases', 'root-cause', 'dashboard', params] as const,
  },
} as const;

// ─── Case Attachments ────────────────────────────────────────────────────────

export function useAddCaseAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ caseNumber, data }: { caseNumber: string; data: Record<string, unknown> }) =>
      casesApi.addAttachment(caseNumber, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cases.all });
    },
  });
}

// ─── Root Cause Analysis ─────────────────────────────────────────────────────

export function useRecurringRootCauses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.rootCause.recurring(params),
    queryFn: () => rootCauseAnalysisApi.recurring(params),
    staleTime: 60_000,
  });
}

export function useRootCauseDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.rootCause.dashboard(params),
    queryFn: () => rootCauseAnalysisApi.dashboard(params),
    staleTime: 60_000,
  });
}

export function useAddCorrectiveAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Record<string, unknown> }) =>
      rootCauseAnalysisApi.addCorrectiveAction(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.rootCause.all });
    },
  });
}

export function useCompleteRootCauseAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => rootCauseAnalysisApi.complete(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.rootCause.all });
    },
  });
}

export function useValidateRootCauseAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => rootCauseAnalysisApi.validate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.rootCause.all });
    },
  });
}

export function useGenerateRootCausePatterns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => rootCauseAnalysisApi.generatePatterns(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.rootCause.all });
    },
  });
}
