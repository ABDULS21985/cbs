import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { custodyApi, type CustodyType } from '../api/custodyApi';

const KEYS = {
  allAccounts: ['custody', 'accounts'] as const,
  customerAccounts: (customerId: string) => ['custody', 'accounts', 'customer', customerId],
  account: (code: string) => ['custody', 'accounts', code],
  dashboard: () => ['settlements', 'dashboard'],
  instructions: () => ['settlements', 'instructions'],
  failedSettlements: () => ['settlements', 'failed'],
  instruction: (ref: string) => ['settlements', 'instructions', ref],
  batches: () => ['settlements', 'batches'],
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
    mutationFn: ({ ref, settled, reason }: { ref: string; settled: boolean; reason?: string }) =>
      custodyApi.recordSettlementResult(ref, settled, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.failedSettlements() });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: KEYS.instructions() });
    },
  });
}

// ─── New hooks ──────────────────────────────────────────────────────────────

export function useAllCustodyAccounts() {
  return useQuery({
    queryKey: KEYS.allAccounts,
    queryFn: () => custodyApi.getAllCustodyAccounts(),
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

export function useSettlementBatches() {
  return useQuery({
    queryKey: KEYS.batches(),
    queryFn: () => custodyApi.getBatches(),
    staleTime: 30_000,
  });
}

export function useMatchInstructions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ref1, ref2 }: { ref1: string; ref2: string }) =>
      custodyApi.matchInstructions(ref1, ref2),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.instructions() });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}

export function useCreateSettlementBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instructionRefs: string[]) => custodyApi.createSettlementBatch(instructionRefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.batches() });
      queryClient.invalidateQueries({ queryKey: KEYS.instructions() });
    },
  });
}
