import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leasesApi } from '../api/leaseExtApi';
import { corporateLeasesApi } from '../api/corporateLeaseApi';
import { mortgagesApi } from '../api/mortgageExtApi';
import { syndicatedLoansApi } from '../api/syndicatedLoanApi';
import { syndicatesApi } from '../api/syndicateApi';
import { leasedAssetsApi } from '../api/leasedAssetApi';
import { posLoansApi } from '../api/posLoanApi';
import { collectionsApi } from '../api/collectionsExtApi';
import { eclApi } from '../api/eclExtApi';
import type { EclModelParameter } from '../types/eclExt';
import type { CorporateLeasePortfolio } from '../types/corporateLease';
import type { SyndicateParticipant, SyndicateDrawdown } from '../types/syndicatedLoan';
import type { LeasedAsset } from '../types/leasedAsset';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  leases: {
    all: ['lending', 'leases'] as const,
    detail: (number: string) => ['lending', 'leases', number] as const,
  },
  corporateLeases: {
    all: ['lending', 'corporate-leases'] as const,
    summary: (customerId: number) => ['lending', 'corporate-leases', 'summary', customerId] as const,
    maturity: (customerId: number) => ['lending', 'corporate-leases', 'maturity', customerId] as const,
  },
  mortgages: {
    all: ['lending', 'mortgages'] as const,
    detail: (number: string) => ['lending', 'mortgages', number] as const,
  },
  syndicatedLoans: {
    all: ['lending', 'syndicated-loans'] as const,
    byRole: (role: string) => ['lending', 'syndicated-loans', 'role', role] as const,
    participants: (code: string) => ['lending', 'syndicated-loans', code, 'participants'] as const,
    drawdowns: (code: string) => ['lending', 'syndicated-loans', code, 'drawdowns'] as const,
  },
  syndicates: {
    all: ['lending', 'syndicates'] as const,
    byType: (type: string) => ['lending', 'syndicates', 'type', type] as const,
    active: ['lending', 'syndicates', 'active'] as const,
  },
  leasedAssets: {
    all: ['lending', 'leased-assets'] as const,
    byContract: (contractId: number) => ['lending', 'leased-assets', 'contract', contractId] as const,
    dueInspection: ['lending', 'leased-assets', 'due-inspection'] as const,
  },
  posLoans: {
    all: ['lending', 'pos-loans'] as const,
    byCustomer: (customerId: number) => ['lending', 'pos-loans', 'customer', customerId] as const,
    byMerchant: (merchantId: number) => ['lending', 'pos-loans', 'merchant', merchantId] as const,
  },
  collections: {
    all: ['lending', 'collections'] as const,
  },
  ecl: {
    all: ['lending', 'ecl'] as const,
    calculations: (date: string) => ['lending', 'ecl', 'calculations', date] as const,
  },
} as const;

// ─── Lease Ext ────────────────────────────────────────────────────────────────

export function useActivateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => leasesApi.activate(number),
    onSuccess: (_data, number) => {
      qc.invalidateQueries({ queryKey: KEYS.leases.all });
      qc.invalidateQueries({ queryKey: KEYS.leases.detail(number) });
    },
  });
}

export function useDepreciateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => leasesApi.depreciate(number),
    onSuccess: (_data, number) => {
      qc.invalidateQueries({ queryKey: KEYS.leases.detail(number) });
    },
  });
}

export function useLeaseBuyout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => leasesApi.buyout(number),
    onSuccess: (_data, number) => {
      qc.invalidateQueries({ queryKey: KEYS.leases.all });
      qc.invalidateQueries({ queryKey: KEYS.leases.detail(number) });
    },
  });
}

export function useTerminateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => leasesApi.terminate(number),
    onSuccess: (_data, number) => {
      qc.invalidateQueries({ queryKey: KEYS.leases.all });
      qc.invalidateQueries({ queryKey: KEYS.leases.detail(number) });
    },
  });
}

// ─── Corporate Lease ──────────────────────────────────────────────────────────

export function useCorporateLeaseSummary(customerId: number) {
  return useQuery({
    queryKey: KEYS.corporateLeases.summary(customerId),
    queryFn: () => corporateLeasesApi.summary(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useCorporateLeaseMaturity(customerId: number) {
  return useQuery({
    queryKey: KEYS.corporateLeases.maturity(customerId),
    queryFn: () => corporateLeasesApi.maturity(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function useUpdateCorporateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CorporateLeasePortfolio> }) =>
      corporateLeasesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.corporateLeases.all });
    },
  });
}

// ─── Mortgage Ext ─────────────────────────────────────────────────────────────

export function useAdvanceMortgage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => mortgagesApi.advance(number),
    onSuccess: (_data, number) => {
      qc.invalidateQueries({ queryKey: KEYS.mortgages.all });
      qc.invalidateQueries({ queryKey: KEYS.mortgages.detail(number) });
    },
  });
}

export function useOverpayMortgage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => mortgagesApi.overpay(number),
    onSuccess: (_data, number) => {
      qc.invalidateQueries({ queryKey: KEYS.mortgages.detail(number) });
    },
  });
}

export function useRevertMortgageSvr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => mortgagesApi.revertSvr(number),
    onSuccess: (_data, number) => {
      qc.invalidateQueries({ queryKey: KEYS.mortgages.detail(number) });
    },
  });
}

// ─── Syndicated Loan ──────────────────────────────────────────────────────────

export function useSyndicatedLoansByRole(role: string) {
  return useQuery({
    queryKey: KEYS.syndicatedLoans.byRole(role),
    queryFn: () => syndicatedLoansApi.getByRole(role),
    enabled: !!role,
    staleTime: 30_000,
  });
}

export function useSyndicatedLoanParticipants(code: string) {
  return useQuery({
    queryKey: KEYS.syndicatedLoans.participants(code),
    queryFn: () => syndicatedLoansApi.getParticipants(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useSyndicatedLoanDrawdowns(code: string) {
  return useQuery({
    queryKey: KEYS.syndicatedLoans.drawdowns(code),
    queryFn: () => syndicatedLoansApi.getDrawdowns(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useAddSyndicateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<SyndicateParticipant> }) =>
      syndicatedLoansApi.addParticipant(code, data),
    onSuccess: (_data, { code }) => {
      qc.invalidateQueries({ queryKey: KEYS.syndicatedLoans.participants(code) });
    },
  });
}

export function useRequestSyndicateDrawdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<SyndicateDrawdown> }) =>
      syndicatedLoansApi.requestDrawdown(code, data),
    onSuccess: (_data, { code }) => {
      qc.invalidateQueries({ queryKey: KEYS.syndicatedLoans.drawdowns(code) });
    },
  });
}

export function useFundSyndicateDrawdown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => syndicatedLoansApi.fundDrawdown(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.syndicatedLoans.all });
    },
  });
}

// ─── Syndicate ────────────────────────────────────────────────────────────────

export function useSyndicatesByType(type: string) {
  return useQuery({
    queryKey: KEYS.syndicates.byType(type),
    queryFn: () => syndicatesApi.byType(type),
    enabled: !!type,
    staleTime: 30_000,
  });
}

export function useActiveSyndicates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.syndicates.active, params],
    queryFn: () => syndicatesApi.active(params),
    staleTime: 30_000,
  });
}

export function useActivateSyndicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => syndicatesApi.activate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.syndicates.all });
    },
  });
}

// ─── Leased Asset ─────────────────────────────────────────────────────────────

export function useLeasedAssetByContract(contractId: number) {
  return useQuery({
    queryKey: KEYS.leasedAssets.byContract(contractId),
    queryFn: () => leasedAssetsApi.returnAsset2(contractId),
    enabled: !!contractId,
    staleTime: 30_000,
  });
}

export function useLeasedAssetsDueInspection(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.leasedAssets.dueInspection, params],
    queryFn: () => leasedAssetsApi.getDueForInspection(params),
    staleTime: 60_000,
  });
}

export function useInspectLeasedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<LeasedAsset> }) =>
      leasedAssetsApi.register(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leasedAssets.all });
    },
  });
}

export function useReturnLeasedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => leasedAssetsApi.returnAsset(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leasedAssets.all });
    },
  });
}

// ─── POS Loan ─────────────────────────────────────────────────────────────────

export function usePosLoansByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.posLoans.byCustomer(customerId),
    queryFn: () => posLoansApi.byCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

export function usePosLoansByMerchant(merchantId: number) {
  return useQuery({
    queryKey: KEYS.posLoans.byMerchant(merchantId),
    queryFn: () => posLoansApi.byMerchant(merchantId),
    enabled: !!merchantId,
    staleTime: 30_000,
  });
}

export function useDisbursePosLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => posLoansApi.disburse(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.posLoans.all });
    },
  });
}

export function useProcessPosLoanReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => posLoansApi.processReturn(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.posLoans.all });
    },
  });
}

// ─── Collections Ext ──────────────────────────────────────────────────────────

export function useSettleCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => collectionsApi.settleCollection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.collections.all });
    },
  });
}

// ─── ECL Ext ──────────────────────────────────────────────────────────────────

export function useEclCalculations(date: string) {
  return useQuery({
    queryKey: KEYS.ecl.calculations(date),
    queryFn: () => eclApi.getCalculations(date),
    enabled: !!date,
    staleTime: 60_000,
  });
}

export function useSaveEclParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EclModelParameter>) => eclApi.saveParam(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.ecl.all });
    },
  });
}
