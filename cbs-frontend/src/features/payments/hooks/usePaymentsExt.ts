import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/paymentExtApi';
import { achExtApi } from '../api/achExtApi';
import { chequesApi } from '../api/chequeExtApi';
import { remittancesApi } from '../api/remittanceApi';
import { payrollApi } from '../api/payrollApi';
import type { PaymentRail, PaymentRoutingRule } from '../types/paymentExt';
import type { AchBatch } from '../types/achExt';
import type { RemittanceCorridor, RemittanceBeneficiary } from '../types/remittance';
import type { PayrollBatch, PayrollItem } from '../types/payroll';

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

export function usePaymentRoutingRules() {
  return useQuery({
    queryKey: ['payments', 'routing-rules'],
    queryFn: () => paymentsApi.getAllRules(),
    staleTime: 60_000,
  });
}

export function useCreateRoutingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PaymentRoutingRule>) => paymentsApi.createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.rails.all });
      qc.invalidateQueries({ queryKey: ['payments', 'routing-rules'] });
    },
  });
}

// ─── ACH Batches ──────────────────────────────────────────────────────────────

export function useAchBatchesByOperatorStatus(operator: string, status: string) {
  return useQuery({
    queryKey: KEYS.ach.byOperatorStatus(operator, status),
    queryFn: () => achExtApi.getBatchesByOperator(operator, status),
    enabled: !!operator && !!status,
    staleTime: 30_000,
  });
}

export function useCreateAchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AchBatch>) => achExtApi.createBatch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ach.all });
    },
  });
}

export function useSubmitAchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => achExtApi.submitBatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ach.all });
    },
  });
}

export function useSettleAchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => achExtApi.settleBatch(id),
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
    mutationFn: (data: {
      accountId: number;
      chequeNumber: string;
      amount: number;
      payeeName: string;
      presentingBankCode?: string;
    }) => chequesApi.present(data),
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
    mutationFn: (data: { accountId: number; chequeNumber: string; reason: string }) =>
      chequesApi.stop(data),
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

/** GET /v1/payroll/batches — list all batches */
export function usePayrollBatches() {
  return useQuery({
    queryKey: KEYS.payroll.all,
    queryFn: () => payrollApi.listAll(),
    staleTime: 30_000,
  });
}

export function usePayrollItems(batchId: string) {
  return useQuery({
    queryKey: KEYS.payroll.items(batchId as unknown as number),
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

export function useAddPayrollItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, items }: { batchId: string; items: Partial<PayrollItem>[] }) =>
      payrollApi.addItems(batchId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.all });
    },
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
    mutationFn: (batchId: string) => payrollApi.validate(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.all });
    },
  });
}

export function useApprovePayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => payrollApi.approve(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.all });
    },
  });
}

export function useProcessPayrollBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => payrollApi.process(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.payroll.all });
    },
  });
}
