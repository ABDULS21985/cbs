import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/paymentExtApi';
import { achApi } from '../api/achExtApi';
import { chequesApi } from '../api/chequeExtApi';
import { remittancesApi } from '../api/remittanceApi';
import { payrollApi } from '../api/payrollApi';
import type { PaymentRail, PaymentRoutingRule } from '../types/paymentExt';
import type { AchBatch } from '../types/achExt';
import type { RemittanceCorridor, RemittanceBeneficiary } from '../types/remittance';
import type { PayrollBatch } from '../types/payroll';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  rails: {
    all: ['payments', 'rails'] as const,
    list: (params?: Record<string, unknown>) => ['payments', 'rails', 'list', params] as const,
  },
  ach: {
    all: ['payments', 'ach'] as const,
    byOperatorStatus: (operator: string, status: string) =>
      ['payments', 'ach', 'batches', operator, status] as const,
  },
  cheques: {
    all: ['payments', 'cheques'] as const,
    books: (accountId: number) => ['payments', 'cheques', 'books', accountId] as const,
    account: (accountId: number) => ['payments', 'cheques', 'account', accountId] as const,
  },
  remittances: {
    all: ['payments', 'remittances'] as const,
    corridors: ['payments', 'remittances', 'corridors'] as const,
    beneficiaries: (customerId: number) =>
      ['payments', 'remittances', 'beneficiaries', customerId] as const,
    history: (customerId: number) =>
      ['payments', 'remittances', 'history', customerId] as const,
  },
  payroll: {
    all: ['payments', 'payroll'] as const,
    items: (batchId: number) => ['payments', 'payroll', 'items', batchId] as const,
    byCustomer: (customerId: number) => ['payments', 'payroll', 'customer', customerId] as const,
  },
} as const;

// ─── Payment Rails / Orchestration ───────────────────────────────────────────

export function usePaymentRails(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.rails.list(params),
    queryFn: () => paymentsApi.getAllRails(params),
    staleTime: 60_000,
  });
}

export function useCreatePaymentRail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PaymentRail>) => paymentsApi.createRail(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.rails.all });
    },
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PaymentRoutingRule>) => paymentsApi.createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.rails.all });
    },
  });
}

// ─── ACH Batches ──────────────────────────────────────────────────────────────

export function useAchBatchesByOperatorStatus(operator: string, status: string) {
  return useQuery({
    queryKey: KEYS.ach.byOperatorStatus(operator, status),
    queryFn: () => achApi.settle2(operator, status),
    enabled: !!operator && !!status,
    staleTime: 30_000,
  });
}

export function useCreateAchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AchBatch>) => achApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ach.all });
    },
  });
}

export function useSubmitAchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AchBatch> }) =>
      achApi.create2(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ach.all });
    },
  });
}

export function useSettleAchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => achApi.settle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ach.all });
    },
  });
}

// ─── Cheques ──────────────────────────────────────────────────────────────────

export function useChequeBooks(accountId: number) {
  return useQuery({
    queryKey: KEYS.cheques.books(accountId),
    queryFn: () => chequesApi.getActiveBooks(accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function useAccountCheques(accountId: number) {
  return useQuery({
    queryKey: KEYS.cheques.account(accountId),
    queryFn: () => chequesApi.getAccountCheques(accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function usePresentCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chequesApi.present(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cheques.all });
    },
  });
}

export function useClearCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leafId: number) => chequesApi.clear(leafId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cheques.all });
    },
  });
}

export function useStopCheque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chequesApi.stop(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.cheques.all });
    },
  });
}

// ─── Remittances ──────────────────────────────────────────────────────────────

export function useRemittanceCorridors(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.remittances.corridors, params],
    queryFn: () => remittancesApi.getAllCorridors(params),
    staleTime: 60_000,
  });
}

export function useRemittanceBeneficiaries(customerId: number) {
  return useQuery({
    queryKey: KEYS.remittances.beneficiaries(customerId),
    queryFn: () => remittancesApi.getBeneficiaries(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useRemittanceHistory(customerId: number) {
  return useQuery({
    queryKey: KEYS.remittances.history(customerId),
    queryFn: () => remittancesApi.getHistory(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useCreateRemittanceCorridor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RemittanceCorridor>) => remittancesApi.createCorridor(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.remittances.corridors });
    },
  });
}

export function useAddRemittanceBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RemittanceBeneficiary>) => remittancesApi.addBeneficiary(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.remittances.all });
    },
  });
}

export function useUpdateRemittanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => remittancesApi.updateStatus(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.remittances.all });
    },
  });
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export function usePayrollItems(batchId: number) {
  return useQuery({
    queryKey: KEYS.payroll.items(batchId),
    queryFn: () => payrollApi.getItems(batchId),
    enabled: !!batchId,
    staleTime: 30_000,
  });
}

export function usePayrollByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.payroll.byCustomer(customerId),
    queryFn: () => payrollApi.byCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useCreatePayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PayrollBatch>) => payrollApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.all });
    },
  });
}

export function useValidatePayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: number) => payrollApi.validate(batchId),
    onSuccess: (_data, batchId) => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.items(batchId) });
    },
  });
}

export function useApprovePayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: number) => payrollApi.approve(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.all });
    },
  });
}

export function useProcessPayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: number) => payrollApi.process(batchId),
    onSuccess: (_data, batchId) => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.all });
      qc.invalidateQueries({ queryKey: KEYS.payroll.items(batchId) });
    },
  });
}
