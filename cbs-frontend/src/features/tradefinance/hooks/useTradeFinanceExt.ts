import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradeFinanceExtApi } from '../api/tradeFinanceExtApi';
import { lcApi } from '../api/lcApi';
import { guaranteesApi } from '../api/guaranteeApi';
import { factoringApi } from '../api/factoringApi';
import { tradeOpsApi } from '../api/tradeOpsApi';
import type {
  LcPaymentTerms,
  GuaranteeType,
  CollectionType,
  DocumentType,
  DocumentComplianceStatus,
  FactoringRecourse,
} from '../api/tradeFinanceExtApi';
import type { TradeConfirmation, OrderAllocation, TradeReport, ClearingSubmission } from '../types/tradeOps';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  lcs: {
    all: ['trade', 'lcs'] as const,
    list: (customerId?: number) => ['trade', 'lcs', customerId ?? 'all'] as const,
    detail: (id: number) => ['trade', 'lc', id] as const,
    customerLcs: (customerId: number) => ['trade', 'lc', 'customer', customerId] as const,
    documents: (lcId: number) => ['trade', 'documents', 'lc', lcId] as const,
  },
  guarantees: {
    all: ['trade', 'guarantees'] as const,
    list: (customerId?: number) => ['trade', 'guarantees', customerId ?? 'all'] as const,
    detail: (id: number) => ['trade', 'guarantee', id] as const,
    customerGuarantees: (customerId: number) =>
      ['trade', 'guarantees', 'customer', customerId] as const,
  },
  scf: {
    programmes: ['trade', 'scf', 'programmes'] as const,
  },
  factoring: {
    all: ['trade', 'factoring'] as const,
    facilities: (params?: Record<string, unknown>) =>
      ['trade', 'factoring', 'facilities', params] as const,
    invoices: (params?: Record<string, unknown>) =>
      ['trade', 'factoring', 'invoices', params] as const,
    concentration: (code: string) =>
      ['trade', 'factoring', 'concentration', code] as const,
  },
  tradeOps: {
    all: ['trade', 'ops'] as const,
    unmatched: (params?: Record<string, unknown>) =>
      ['trade', 'ops', 'unmatched', params] as const,
    pendingClearing: (params?: Record<string, unknown>) =>
      ['trade', 'ops', 'pending-clearing', params] as const,
  },
} as const;

// ─── Letters of Credit (tradeFinanceExtApi) ──────────────────────────────────

export function useLettersOfCredit(customerId?: number) {
  return useQuery({
    queryKey: KEYS.lcs.list(customerId),
    queryFn: () =>
      customerId
        ? tradeFinanceExtApi.getCustomerLcs(customerId)
        : tradeFinanceExtApi.getCustomerLcs(0),
    enabled: customerId !== undefined ? !!customerId : true,
    staleTime: 30_000,
  });
}

export function useLetterOfCredit(id: number) {
  return useQuery({
    queryKey: KEYS.lcs.detail(id),
    queryFn: () => tradeFinanceExtApi.getLc(id),
    enabled: !!id,
  });
}

export function useIssueLc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      applicant: string;
      beneficiary: string;
      currency: string;
      amount: number;
      expiryDate: string;
      paymentTerms: LcPaymentTerms;
      tenor?: number;
    }) => tradeFinanceExtApi.issueLc(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lcs.all });
    },
  });
}

export function useSettleLc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: { presentationDate: string; presentedDocuments: string[]; discrepancies?: string };
    }) => tradeFinanceExtApi.settleLc(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.lcs.all });
      qc.invalidateQueries({ queryKey: KEYS.lcs.detail(id) });
    },
  });
}

// ─── LC API (lcApi) ──────────────────────────────────────────────────────────

export function useLcDetail(id: number) {
  return useQuery({
    queryKey: KEYS.lcs.detail(id),
    queryFn: () => lcApi.getLC(id),
    enabled: !!id,
  });
}

export function useCustomerLCs(customerId: number) {
  return useQuery({
    queryKey: KEYS.lcs.customerLcs(customerId),
    queryFn: () => lcApi.getCustomerLCs(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useSettleLcDirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lcApi.settleLC(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lcs.all });
    },
  });
}

export function useExpireLCs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => lcApi.expireLCs(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lcs.all });
    },
  });
}

// ─── Bank Guarantees (tradeFinanceExtApi) ────────────────────────────────────

export function useBankGuarantees(customerId?: number) {
  return useQuery({
    queryKey: KEYS.guarantees.list(customerId),
    queryFn: () =>
      customerId
        ? tradeFinanceExtApi.getCustomerGuarantees(customerId)
        : tradeFinanceExtApi.getCustomerGuarantees(0),
    enabled: customerId !== undefined ? !!customerId : true,
    staleTime: 30_000,
  });
}

export function useIssueGuarantee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      applicant: string;
      beneficiary: string;
      guaranteeType: GuaranteeType;
      currency: string;
      amount: number;
      expiryDate: string;
    }) => tradeFinanceExtApi.issueGuarantee(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.guarantees.all });
    },
  });
}

export function useClaimGuarantee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: { claimAmount: number; claimRef: string; claimDate: string };
    }) => tradeFinanceExtApi.claimGuarantee(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.guarantees.all });
      qc.invalidateQueries({ queryKey: KEYS.guarantees.detail(id) });
    },
  });
}

// ─── Guarantees API (guaranteesApi) ──────────────────────────────────────────

export function useGuaranteeDetail(id: number) {
  return useQuery({
    queryKey: KEYS.guarantees.detail(id),
    queryFn: () => guaranteesApi.getGuarantee(id),
    enabled: !!id,
  });
}

export function useCustomerGuarantees(customerId: number) {
  return useQuery({
    queryKey: KEYS.guarantees.customerGuarantees(customerId),
    queryFn: () => guaranteesApi.getCustomerGuarantees(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useClaimGuaranteeDirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => guaranteesApi.claimGuarantee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.guarantees.all });
    },
  });
}

export function useProcessGuaranteeExpiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => guaranteesApi.processGuaranteeExpiry(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.guarantees.all });
    },
  });
}

// ─── SCF Programmes ──────────────────────────────────────────────────────────

export function useScfProgrammes() {
  return useQuery({
    queryKey: KEYS.scf.programmes,
    queryFn: () => tradeFinanceExtApi.listScfProgrammes(),
    staleTime: 60_000,
  });
}

export function useCreateScfProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      buyer: string;
      currency: string;
      discountRate: number;
      limitAmount: number;
    }) => tradeFinanceExtApi.createScfProgramme(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scf.programmes });
    },
  });
}

export function useFinanceInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      programmeId: number;
      supplier: string;
      invoiceRef: string;
      amount: number;
      invoiceDate: string;
      maturityDate: string;
    }) => tradeFinanceExtApi.financeInvoice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.scf.programmes });
    },
  });
}

// ─── Trade Documents ─────────────────────────────────────────────────────────

export function useLcDocuments(lcId: number) {
  return useQuery({
    queryKey: KEYS.lcs.documents(lcId),
    queryFn: () => tradeFinanceExtApi.getLcDocuments(lcId),
    enabled: !!lcId,
  });
}

export function useVerifyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: { status: DocumentComplianceStatus; discrepancies?: string[] };
    }) => tradeFinanceExtApi.verifyDocument(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade', 'documents'] });
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { documentType: DocumentType; lcId?: number }) =>
      tradeFinanceExtApi.uploadDocument(input),
    onSuccess: (_data, variables) => {
      if (variables.lcId) {
        qc.invalidateQueries({ queryKey: KEYS.lcs.documents(variables.lcId) });
      }
    },
  });
}

// ─── Factoring (tradeFinanceExtApi) ──────────────────────────────────────────

export function useFactoringFacilitiesExt() {
  return useQuery({
    queryKey: [...KEYS.factoring.all, 'ext'],
    queryFn: () => factoringApi.listFacilities(),
    staleTime: 60_000,
  });
}

export function useCreateFactoringFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      seller: string;
      limitAmount: number;
      currency: string;
      recourse: FactoringRecourse;
      discountRate: number;
    }) => tradeFinanceExtApi.createFactoringFacility(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.factoring.all });
    },
  });
}

export function useSubmitInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      facilityCode: string;
      buyerName: string;
      invoiceRef: string;
      amount: number;
      invoiceDate: string;
      dueDate: string;
    }) => tradeFinanceExtApi.submitInvoice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.factoring.all });
    },
  });
}

export function useFundInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tradeFinanceExtApi.fundInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.factoring.all });
    },
  });
}

export function useRecordCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: { amount: number; collectionDate: string } }) =>
      tradeFinanceExtApi.recordCollection(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.factoring.all });
    },
  });
}

export function useCreateCollection() {
  return useMutation({
    mutationFn: (input: {
      drawer: string;
      drawee: string;
      currency: string;
      amount: number;
      type: CollectionType;
      documents: string[];
    }) => tradeFinanceExtApi.createCollection(input),
  });
}

// ─── Factoring API (factoringApi) ────────────────────────────────────────────

export function useFactoringFacilities(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.factoring.facilities(params),
    queryFn: () => factoringApi.listFacilities(params),
    staleTime: 30_000,
  });
}

export function useFactoringInvoices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.factoring.invoices(params),
    queryFn: () => factoringApi.listInvoices(params),
    staleTime: 30_000,
  });
}

export function useFactoringConcentration(code: string) {
  return useQuery({
    queryKey: KEYS.factoring.concentration(code),
    queryFn: () => factoringApi.concentration(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useFactoringRecourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => factoringApi.recourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.factoring.all });
    },
  });
}

// ─── Trade Ops ───────────────────────────────────────────────────────────────

export function useUnmatchedConfirmations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.tradeOps.unmatched(params),
    queryFn: () => tradeOpsApi.getUnmatched(params),
    staleTime: 30_000,
  });
}

export function usePendingClearing(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.tradeOps.pendingClearing(params),
    queryFn: () => tradeOpsApi.getPendingClearing(params),
    staleTime: 30_000,
  });
}

export function useSubmitTradeConfirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TradeConfirmation>) => tradeOpsApi.submitConfirmation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tradeOps.all });
    },
  });
}

export function useMatchConfirmations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tradeOpsApi.matchConfirmation(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tradeOps.all });
    },
  });
}

export function useAllocateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<OrderAllocation>) => tradeOpsApi.allocateOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tradeOps.all });
    },
  });
}

export function useSubmitTradeReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TradeReport>) => tradeOpsApi.submitTradeReport(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tradeOps.all });
    },
  });
}

export function useSubmitForClearing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ClearingSubmission>) => tradeOpsApi.submitForClearing(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tradeOps.all });
    },
  });
}
