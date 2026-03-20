import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tdFrameworksApi } from '../api/tdFrameworkApi';
import { tdFrameworkSummaryApi } from '../api/tdFrameworkSummaryApi';
import type { TdFrameworkAgreement } from '../types/tdFramework';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  tdFrameworks: {
    all: ['deposits', 'td-frameworks'] as const,
    detail: (number: string) => ['deposits', 'td-frameworks', 'detail', number] as const,
    rate: (number: string) => ['deposits', 'td-frameworks', number, 'rate'] as const,
    byCustomer: (customerId: number) =>
      ['deposits', 'td-frameworks', 'customer', customerId] as const,
  },
  tdSummary: {
    all: ['deposits', 'td-summary'] as const,
    maturityLadder: (agreementId: number) =>
      ['deposits', 'td-summary', agreementId, 'maturity-ladder'] as const,
    rolloverForecast: (agreementId: number) =>
      ['deposits', 'td-summary', agreementId, 'rollover-forecast'] as const,
    largeDeposits: (params?: Record<string, unknown>) =>
      ['deposits', 'td-summary', 'large-deposits', params] as const,
    history: (agreementId: number) =>
      ['deposits', 'td-summary', agreementId, 'history'] as const,
  },
} as const;

// ─── TD Framework ────────────────────────────────────────────────────────────

export function useTdFrameworks() {
  return useQuery({
    queryKey: KEYS.tdFrameworks.all,
    queryFn: () => tdFrameworksApi.getAll(),
    staleTime: 30_000,
  });
}

export function useTdFramework(number: string) {
  return useQuery({
    queryKey: KEYS.tdFrameworks.detail(number),
    queryFn: () => tdFrameworksApi.getByNumber(number),
    enabled: !!number,
    staleTime: 30_000,
  });
}

export function useCreateTdFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TdFrameworkAgreement>) => tdFrameworksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tdFrameworks.all });
    },
  });
}

export function useTdFrameworkRate(number: string) {
  return useQuery({
    queryKey: KEYS.tdFrameworks.rate(number),
    queryFn: () => tdFrameworksApi.getRate(number),
    enabled: !!number,
    staleTime: 60_000,
  });
}

export function useTdFrameworksByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.tdFrameworks.byCustomer(customerId),
    queryFn: () => tdFrameworksApi.byCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useApproveTdFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => tdFrameworksApi.approve(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tdFrameworks.all });
    },
  });
}

// ─── TD Framework Summary ────────────────────────────────────────────────────

export function useTdMaturityLadder(agreementId: number) {
  return useQuery({
    queryKey: KEYS.tdSummary.maturityLadder(agreementId),
    queryFn: () => tdFrameworkSummaryApi.maturityLadder(agreementId),
    enabled: !!agreementId,
    staleTime: 60_000,
  });
}

export function useTdRolloverForecast(agreementId: number) {
  return useQuery({
    queryKey: KEYS.tdSummary.rolloverForecast(agreementId),
    queryFn: () => tdFrameworkSummaryApi.rolloverForecast(agreementId),
    enabled: !!agreementId,
    staleTime: 60_000,
  });
}

export function useLargeDeposits(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.tdSummary.largeDeposits(params),
    queryFn: () => tdFrameworkSummaryApi.largeDeposits(params),
    staleTime: 30_000,
  });
}

export function useTdHistory(agreementId: number) {
  return useQuery({
    queryKey: KEYS.tdSummary.history(agreementId),
    queryFn: () => tdFrameworkSummaryApi.history(agreementId),
    enabled: !!agreementId,
    staleTime: 30_000,
  });
}
