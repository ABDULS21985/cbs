import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { LoanApplication, LoanAccount, RepaymentScheduleItem, LoanPayment, LoanFilters } from '../types/loan';
import { handleApiError } from '@/lib/errorHandler';

export function useLoanApplications(filters?: LoanFilters) {
  const normalizedFilters = filters as Record<string, unknown> | undefined;

  return useQuery({
    queryKey: queryKeys.loans.applications(normalizedFilters),
    queryFn: () => apiGet<LoanApplication[]>('/api/v1/loans/applications', normalizedFilters).catch(() => []),
  });
}

export function useLoanApplication(id: number) {
  return useQuery({
    queryKey: ['loans', 'application', id],
    queryFn: () => apiGet<LoanApplication>(`/api/v1/loans/applications/${id}`),
    enabled: !!id,
  });
}

export function useActiveLoans(filters?: LoanFilters) {
  const normalizedFilters = filters as Record<string, unknown> | undefined;

  return useQuery({
    queryKey: queryKeys.loans.list(normalizedFilters),
    queryFn: () => apiGet<LoanAccount[]>('/api/v1/loans', normalizedFilters).catch(() => []),
  });
}

export function useLoan(id: number | string) {
  return useQuery({
    queryKey: queryKeys.loans.detail(typeof id === 'string' ? parseInt(id) : id),
    queryFn: () => apiGet<LoanAccount>(`/api/v1/loans/${id}`),
    enabled: !!id,
  });
}

export function useLoanSchedule(loanId: number) {
  return useQuery({
    queryKey: queryKeys.loans.schedule(loanId),
    queryFn: () => apiGet<RepaymentScheduleItem[]>(`/api/v1/loans/${loanId}/schedule`).catch(() => []),
    enabled: !!loanId,
  });
}

export function useLoanPayments(loanId: number) {
  return useQuery({
    queryKey: ['loans', loanId, 'payments'],
    queryFn: () => apiGet<LoanPayment[]>(`/api/v1/loans/${loanId}/payments`).catch(() => []),
    enabled: !!loanId,
  });
}

export function useSubmitLoanApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LoanApplication>) => apiPost<LoanApplication>('/api/v1/loans/apply', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.loans.all }),
    onError: handleApiError,
  });
}

export function useRecordPayment(loanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; sourceAccountId: number; type: string }) =>
      apiPost<LoanPayment>(`/api/v1/loans/${loanId}/repay`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.detail(loanId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.schedule(loanId) });
    },
    onError: handleApiError,
  });
}

export function usePortfolioStats() {
  return useQuery({
    queryKey: ['loans', 'portfolio', 'stats'],
    queryFn: () => apiGet<any>('/api/v1/loans/portfolio/stats').catch(() => null),
    staleTime: 60_000,
  });
}
