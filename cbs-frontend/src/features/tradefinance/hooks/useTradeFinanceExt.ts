import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradeFinanceExtApi } from '../api/tradeFinanceExtApi';
import type {
  LcPaymentTerms,
  GuaranteeType,
  CollectionType,
  DocumentType,
  DocumentComplianceStatus,
  FactoringRecourse,
} from '../api/tradeFinanceExtApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const keys = {
  lcs: (customerId?: number) => ['trade', 'lcs', customerId ?? 'all'] as const,
  lc: (id: number) => ['trade', 'lc', id] as const,
  guarantees: (customerId?: number) => ['trade', 'guarantees', customerId ?? 'all'] as const,
  guarantee: (id: number) => ['trade', 'guarantee', id] as const,
  scfProgrammes: ['trade', 'scf', 'programmes'] as const,
  lcDocuments: (lcId: number) => ['trade', 'documents', 'lc', lcId] as const,
  factoringFacilities: ['factoring', 'facilities'] as const,
};

// ─── Letters of Credit ────────────────────────────────────────────────────────

export function useLettersOfCredit(customerId?: number) {
  return useQuery({
    queryKey: keys.lcs(customerId),
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
    queryKey: keys.lc(id),
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
      qc.invalidateQueries({ queryKey: ['trade', 'lcs'] });
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
      qc.invalidateQueries({ queryKey: ['trade', 'lcs'] });
      qc.invalidateQueries({ queryKey: keys.lc(id) });
    },
  });
}

// ─── Bank Guarantees ──────────────────────────────────────────────────────────

export function useBankGuarantees(customerId?: number) {
  return useQuery({
    queryKey: keys.guarantees(customerId),
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
      qc.invalidateQueries({ queryKey: ['trade', 'guarantees'] });
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
      qc.invalidateQueries({ queryKey: ['trade', 'guarantees'] });
      qc.invalidateQueries({ queryKey: keys.guarantee(id) });
    },
  });
}

// ─── SCF Programmes ───────────────────────────────────────────────────────────

export function useScfProgrammes() {
  return useQuery({
    queryKey: keys.scfProgrammes,
    queryFn: () =>
      // SCF programmes list is derived from created programmes; use a fallback empty list
      Promise.resolve([] as Awaited<ReturnType<typeof tradeFinanceExtApi.createScfProgramme>>[]),
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
      qc.invalidateQueries({ queryKey: keys.scfProgrammes });
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
      qc.invalidateQueries({ queryKey: keys.scfProgrammes });
    },
  });
}

// ─── Trade Documents ──────────────────────────────────────────────────────────

export function useLcDocuments(lcId: number) {
  return useQuery({
    queryKey: keys.lcDocuments(lcId),
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
        qc.invalidateQueries({ queryKey: keys.lcDocuments(variables.lcId) });
      }
    },
  });
}

// ─── Factoring ────────────────────────────────────────────────────────────────

export function useFactoringFacilities() {
  return useQuery({
    queryKey: keys.factoringFacilities,
    queryFn: () =>
      Promise.resolve([] as Awaited<ReturnType<typeof tradeFinanceExtApi.createFactoringFacility>>[]),
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
      qc.invalidateQueries({ queryKey: keys.factoringFacilities });
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
      qc.invalidateQueries({ queryKey: keys.factoringFacilities });
    },
  });
}

export function useFundInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tradeFinanceExtApi.fundInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.factoringFacilities });
    },
  });
}

export function useRecordCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: { amount: number; collectionDate: string } }) =>
      tradeFinanceExtApi.recordCollection(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.factoringFacilities });
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
