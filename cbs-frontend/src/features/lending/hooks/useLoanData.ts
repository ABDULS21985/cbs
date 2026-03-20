import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { LoanFilters } from '../types/loan';
import { handleApiError } from '@/lib/errorHandler';
import { loanApi, type LoanApplicationRequest } from '../api/loanApi';
import { getLoanPortfolioStats } from '@/features/reports/api/loanAnalyticsApi';

export function useLoanApplications(filters?: LoanFilters) {
  return useQuery({
    queryKey: queryKeys.loans.applications(filters as Record<string, unknown> | undefined),
    queryFn: () => loanApi.getCustomerApplications(0),
  });
}

export function useLoanApplication(id: number) {
  return useQuery({
    queryKey: ['loans', 'application', id],
    queryFn: () => loanApi.getApplication(id),
    enabled: !!id,
  });
}

export function useActiveLoans(filters?: LoanFilters) {
  return useQuery({
    queryKey: queryKeys.loans.list(filters as Record<string, unknown> | undefined),
    queryFn: () => loanApi.getCustomerLoans(0),
  });
}

export function useLoan(id: number | string) {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return useQuery({
    queryKey: queryKeys.loans.detail(numericId),
    queryFn: () => loanApi.getLoan(numericId),
    enabled: !!id,
  });
}

export function useLoanSchedule(loanId: number) {
  return useQuery({
    queryKey: queryKeys.loans.schedule(loanId),
    queryFn: () => loanApi.getSchedule(loanId),
    enabled: !!loanId,
  });
}

export function useSubmitLoanApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LoanApplicationRequest) => loanApi.submitApplication(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.loans.all }),
    onError: handleApiError,
  });
}

export function useRecordPayment(loanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => loanApi.recordPayment(loanId, amount),
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
    queryFn: () => getLoanPortfolioStats(),
    staleTime: 60_000,
  });
}
