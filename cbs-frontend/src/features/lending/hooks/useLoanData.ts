import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { LoanFilters } from '../types/loan';
import { handleApiError } from '@/lib/errorHandler';
import { loanApi, type LoanApplicationRequest } from '../api/loanApi';

export function useLoanApplications(filters?: LoanFilters) {
  return useQuery({
    queryKey: queryKeys.loans.applications(filters as Record<string, unknown> | undefined),
    // Uses GET /v1/loans/applications with optional status filter
    queryFn: () => loanApi.listApplications({
      status: (filters as Record<string, unknown> | undefined)?.status as string | undefined,
      page: 0,
      size: 100,
    }),
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
    // Uses the proper GET /v1/loans endpoint with search/page/size
    queryFn: () => loanApi.listLoans({
      search: (filters as Record<string, unknown> | undefined)?.search as string | undefined,
      page: 0,
      size: 100,
    }),
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

export function useApproveLoanApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approval }: {
      id: number;
      approval: { approvedAmount: number; approvedTenureMonths: number; approvedRate: number; conditions?: string[] };
    }) => loanApi.approveApplication(id, approval),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.loans.all }),
    onError: handleApiError,
  });
}

export function useDeclineLoanApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      loanApi.declineApplication(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.loans.all }),
    onError: handleApiError,
  });
}

export function useDisburseLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: number) => loanApi.disburse(applicationId),
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
    queryFn: () => loanApi.getPortfolioStats(),
    staleTime: 60_000,
  });
}

export function useSettlementCalculation(loanId: number) {
  return useQuery({
    queryKey: ['loans', loanId, 'settlement'],
    queryFn: () => loanApi.getSettlementCalculation(loanId),
    enabled: !!loanId,
    staleTime: 30_000,
  });
}

export function usePreviewSchedule() {
  return useMutation({
    mutationFn: (data: LoanApplicationRequest) => loanApi.previewSchedule(data),
  });
}

export function useBatchAccrueInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => loanApi.batchAccrueInterest(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.loans.all }),
    onError: handleApiError,
  });
}
