import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  custodyApi,
  type CreateCustodyAccountPayload,
  type CreateSettlementInstructionPayload,
  type CreateSettlementBatchPayload,
} from '../api/custodyApi';

const KEYS = {
  allAccounts: ['custody', 'accounts'] as const,
  customerAccounts: (customerId: number) => ['custody', 'accounts', 'customer', customerId],
  account: (code: string) => ['custody', 'accounts', code],
  dashboard: () => ['settlements', 'dashboard'],
  instructions: () => ['settlements', 'instructions'],
  instruction: (ref: string) => ['settlements', 'instructions', ref],
  failedSettlements: () => ['settlements', 'failed'],
  batches: () => ['settlements', 'batches'],
};

export function useAllCustodyAccounts() {
  return useQuery({
    queryKey: KEYS.allAccounts,
    queryFn: () => custodyApi.getAllCustodyAccounts(),
    staleTime: 30_000,
  });
}

export function useCustomerCustodyAccounts(customerId: number) {
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

export function useSettlementInstructions() {
  return useQuery({
    queryKey: KEYS.instructions(),
    queryFn: () => custodyApi.getInstructions(),
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

export function useFailedSettlements() {
  return useQuery({
    queryKey: KEYS.failedSettlements(),
    queryFn: () => custodyApi.getFailedSettlements(),
    staleTime: 30_000,
  });
}

export function useSettlementBatches() {
  return useQuery({
    queryKey: KEYS.batches(),
    queryFn: () => custodyApi.getBatches(),
    staleTime: 30_000,
  });
}

export function useCreateCustodyAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustodyAccountPayload) =>
      custodyApi.openCustodyAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.allAccounts });
    },
  });
}

export function useCreateSettlementInstruction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSettlementInstructionPayload) =>
      custodyApi.createSettlementInstruction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.instructions() });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}

export function useMatchInstructions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ refA, refB }: { refA: string; refB: string }) =>
      custodyApi.matchInstructions(refA, refB),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.instructions() });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}

export function useSubmitSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => custodyApi.submitSettlement(ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.instructions() });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}

export function useRecordSettlementResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ref, settled }: { ref: string; settled: boolean }) =>
      custodyApi.recordSettlementResult(ref, settled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.failedSettlements() });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: KEYS.instructions() });
    },
  });
}

export function useCreateSettlementBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSettlementBatchPayload) =>
      custodyApi.createSettlementBatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.batches() });
    },
  });
}
