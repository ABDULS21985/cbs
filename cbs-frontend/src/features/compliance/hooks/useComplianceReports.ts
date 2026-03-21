import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  complianceReportApi,
  type Regulator,
  type CreateReportPayload,
} from '../api/complianceReportApi';

const KEYS = {
  all: ['compliance-reports'] as const,
  byRegulator: (regulator: Regulator) =>
    ['compliance-reports', 'regulator', regulator] as const,
  overdue: () => ['compliance-reports', 'overdue'] as const,
};

export function useComplianceReports(regulator?: Regulator) {
  return useQuery({
    queryKey: regulator ? KEYS.byRegulator(regulator) : KEYS.all,
    queryFn: () =>
      regulator
        ? complianceReportApi.getByRegulator(regulator)
        : complianceReportApi.getAll(),
    staleTime: 30_000,
  });
}

export function useOverdueReports() {
  return useQuery({
    queryKey: KEYS.overdue(),
    queryFn: () => complianceReportApi.getOverdue(),
    staleTime: 30_000,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => complianceReportApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => complianceReportApi.submitForReview(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useSubmitToRegulator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, submissionReference }: { code: string; submissionReference: string }) =>
      complianceReportApi.submitToRegulator(code, submissionReference),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
