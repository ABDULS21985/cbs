import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  complianceReportApi,
  type Regulator,
  type CreateReportPayload,
  type SubmitForReviewPayload,
  type SubmitToRegulatorPayload,
} from '../api/complianceReportApi';

const KEYS = {
  byRegulator: (regulator: Regulator, page = 0) =>
    ['compliance-reports', 'regulator', regulator, page] as const,
  overdue: () => ['compliance-reports', 'overdue'] as const,
};

export function useComplianceReports(regulator?: Regulator, page = 0) {
  return useQuery({
    queryKey: KEYS.byRegulator(regulator ?? 'CBN', page),
    queryFn: () =>
      regulator
        ? complianceReportApi.getByRegulator(regulator, { page, size: 20 })
        : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 }),
    staleTime: 30_000,
    enabled: !!regulator,
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
      qc.invalidateQueries({ queryKey: ['compliance-reports'] });
    },
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: SubmitForReviewPayload }) =>
      complianceReportApi.submitForReview(code, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-reports'] });
    },
  });
}

export function useSubmitToRegulator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: SubmitToRegulatorPayload }) =>
      complianceReportApi.submitToRegulator(code, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-reports'] });
    },
  });
}
