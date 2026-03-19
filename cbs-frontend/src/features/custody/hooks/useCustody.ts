import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { custodyApi, type CustodyType } from '../api/custodyApi';

const KEYS = {
  customerAccounts: (customerId: string) => ['custody', 'accounts', 'customer', customerId],
  account: (code: string) => ['custody', 'accounts', code],
  dashboard: () => ['settlements', 'dashboard'],
  failedSettlements: () => ['settlements', 'failed'],
  instruction: (ref: string) => ['settlements', 'instructions', ref],
};

export function useCustomerCustodyAccounts(customerId: string) {
  return useQuery({
    queryKey: KEYS.customerAccounts(customerId),
    queryFn: () => custodyApi.getCustomerCustodyAccounts(customerId),
    enabled: !!customerId,
  });
}

export function useCustodyAccount(code: string) {
  return useQuery({
    queryKey: KEYS.account(code),
    queryFn: () => custodyApi.getCustodyAccount(code),
    enabled: !!code,
  });
}

export function useSettlementDashboard() {
  return useQuery({
    queryKey: KEYS.dashboard(),
    queryFn: () => custodyApi.getSettlementDashboard(),
    staleTime: 30_000,
  });
}

export function useFailedSettlements() {
  return useQuery({
    queryKey: KEYS.failedSettlements(),
    queryFn: () => custodyApi.getFailedSettlements(),
    staleTime: 30_000,
  });
}

export function useSettlementInstruction(ref: string) {
  return useQuery({
    queryKey: KEYS.instruction(ref),
    queryFn: () => custodyApi.getSettlementInstruction(ref),
    enabled: !!ref,
  });
}

export function useCreateCustodyAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      customerId: string;
      custodyType: CustodyType;
      denomination: string;
      custodian: string;
    }) => custodyApi.openCustodyAccount(payload),
    onSuccess: (_data, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.customerAccounts(customerId) });
    },
  });
}

export function useCreateSettlementInstruction() {
  return useMutation({
    mutationFn: (payload: {
      from: string;
      to: string;
      amount: number;
      currency: string;
      settlementDate: string;
      instrumentCode: string;
    }) => custodyApi.createSettlementInstruction(payload),
  });
}

export function useSubmitSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => custodyApi.submitSettlement(ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}

export function useRecordSettlementResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ref,
      status,
      failureReason,
    }: {
      ref: string;
      status: 'SETTLED' | 'FAILED';
      failureReason?: string;
    }) => custodyApi.recordSettlementResult(ref, status, failureReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.failedSettlements() });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}
