import { apiGet, apiPost, apiPut } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CustomerAgreement,
  CreateCustomerAgreementPayload,
  CreateTdFrameworkPayload,
  TdFrameworkSummary,
  CommissionAgreement,
  CreateCommissionAgreementPayload,
  CalculatePayoutParams,
  CreateDiscountSchemePayload,
  CreateSpecialPricingPayload,
} from '../types/agreementExt';
import {
  getAgreements,
  createAgreement,
  activateAgreement,
  terminateAgreement,
  getCustomerAgreements,
  getTdFrameworks,
  getTdFramework,
  createTdFramework,
  approveTdFramework,
  getTdFrameworkRate,
  getCustomerTdFrameworks,
  createTdSummary,
  getMaturityLadder,
  getRolloverForecast,
  getLargeDeposits,
  getTdSummaryHistory,
  getCommissionAgreements,
  createCommissionAgreement,
  activateCommissionAgreement,
  calculatePayout,
  approvePayout,
  getPartyCommissionAgreements,
  getPartyPayouts,
  getDiscountSchemes,
  getActiveDiscounts,
  createDiscountScheme,
  evaluateDiscount,
  getDiscountEvaluation,
  getDiscountUtilization,
  getSpecialPricingAgreements,
  createSpecialPricing,
  getCustomerSpecialPricing,
  reviewSpecialPricing,
  getAgreementTemplates,
} from '../api/agreementApi';

// ── Query Key Factory ────────────────────────────────────────────────────────

export const agreementKeys = {
  all: ['agreements'] as const,
  lists: () => [...agreementKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...agreementKeys.lists(), filters] as const,
  details: () => [...agreementKeys.all, 'detail'] as const,
  detail: (id: string) => [...agreementKeys.details(), id] as const,
  customer: (customerId: number) => [...agreementKeys.all, 'customer', customerId] as const,
  tdFrameworks: ['td-frameworks'] as const,
  tdCustomer: (customerId: number) => ['td-frameworks', 'customer', customerId] as const,
  tdSummary: (agreementId: number) => ['td-summary', agreementId] as const,
  tdMaturity: (agreementId: number) => ['td-summary', agreementId, 'maturity'] as const,
  tdRollover: (agreementId: number) => ['td-summary', agreementId, 'rollover'] as const,
  tdLargeDeposits: (threshold?: number) => ['td-summary', 'large-deposits', threshold] as const,
  tdHistory: (agreementId: number) => ['td-summary', agreementId, 'history'] as const,
  commissions: ['commissions'] as const,
  partyCommissions: (partyId: string) => ['commissions', 'party', partyId] as const,
  payouts: (partyId: string) => ['commission-payouts', partyId] as const,
  discounts: ['discounts'] as const,
  activeDiscounts: ['discounts', 'active'] as const,
  discountEvaluation: ['discounts', 'evaluation'] as const,
  discountUtilization: ['discounts', 'utilization'] as const,
  specialPricing: ['special-pricing'] as const,
  customerSpecialPricing: (customerId: number) => ['special-pricing', 'customer', customerId] as const,
  templates: ['agreement-templates'] as const,
};

const QUERY_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

// ── Customer Agreement Queries ───────────────────────────────────────────────

export function useAgreements() {
  return useQuery({
    queryKey: agreementKeys.lists(),
    queryFn: getAgreements,
    ...QUERY_DEFAULTS,
  });
}

export function useCustomerAgreements(customerId: number) {
  return useQuery({
    queryKey: agreementKeys.customer(customerId),
    queryFn: () => getCustomerAgreements(customerId),
    enabled: !!customerId,
    ...QUERY_DEFAULTS,
  });
}

// ── Customer Agreement Mutations ─────────────────────────────────────────────

export function useCreateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerAgreementPayload) => createAgreement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.all });
    },
  });
}

export function useActivateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agreementNumber: string) => activateAgreement(agreementNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.all });
    },
  });
}

export function useTerminateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agreementNumber, reason }: { agreementNumber: string; reason?: string }) =>
      terminateAgreement(agreementNumber, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.all });
    },
  });
}

// ── TD Framework Queries ─────────────────────────────────────────────────────

export function useCustomerTdFrameworks(customerId: number) {
  return useQuery({
    queryKey: agreementKeys.tdCustomer(customerId),
    queryFn: () => getCustomerTdFrameworks(customerId),
    enabled: !!customerId,
    ...QUERY_DEFAULTS,
  });
}

export function useMaturityLadder(agreementId: number) {
  return useQuery({
    queryKey: agreementKeys.tdMaturity(agreementId),
    queryFn: () => getMaturityLadder(agreementId),
    enabled: !!agreementId,
    ...QUERY_DEFAULTS,
  });
}

export function useRolloverForecast(agreementId: number) {
  return useQuery({
    queryKey: agreementKeys.tdRollover(agreementId),
    queryFn: () => getRolloverForecast(agreementId),
    enabled: !!agreementId,
    ...QUERY_DEFAULTS,
  });
}

export function useLargeDeposits(threshold?: number) {
  return useQuery({
    queryKey: agreementKeys.tdLargeDeposits(threshold),
    queryFn: () => getLargeDeposits(threshold),
    ...QUERY_DEFAULTS,
  });
}

export function useTdSummaryHistory(agreementId: number) {
  return useQuery({
    queryKey: agreementKeys.tdHistory(agreementId),
    queryFn: () => getTdSummaryHistory(agreementId),
    enabled: !!agreementId,
    ...QUERY_DEFAULTS,
  });
}

// ── TD Framework Mutations ───────────────────────────────────────────────────

export function useCreateTdFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTdFrameworkPayload) => createTdFramework(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.tdFrameworks });
    },
  });
}

export function useApproveTdFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agreementNumber, approvedBy }: { agreementNumber: string; approvedBy: string }) =>
      approveTdFramework(agreementNumber, approvedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.tdFrameworks });
    },
  });
}

export function useCheckTdRate() {
  return useMutation({
    mutationFn: ({
      agreementNumber,
      amount,
      tenorDays,
    }: {
      agreementNumber: string;
      amount: number;
      tenorDays: number;
    }) => getTdFrameworkRate(agreementNumber, { amount, tenorDays }),
  });
}

export function useCreateTdSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TdFrameworkSummary>) => createTdSummary(data),
    onSuccess: (_data, variables) => {
      if (variables.agreementId) {
        qc.invalidateQueries({ queryKey: agreementKeys.tdSummary(variables.agreementId) });
        qc.invalidateQueries({ queryKey: agreementKeys.tdHistory(variables.agreementId) });
        qc.invalidateQueries({ queryKey: agreementKeys.tdMaturity(variables.agreementId) });
        qc.invalidateQueries({ queryKey: agreementKeys.tdRollover(variables.agreementId) });
      }
    },
  });
}

// ── Commission Queries ───────────────────────────────────────────────────────

export function useCommissionAgreements() {
  return useQuery({
    queryKey: agreementKeys.commissions,
    queryFn: getCommissionAgreements,
    ...QUERY_DEFAULTS,
  });
}

export function usePartyCommissions(partyId: string) {
  return useQuery({
    queryKey: agreementKeys.partyCommissions(partyId),
    queryFn: () => getPartyCommissionAgreements(partyId),
    enabled: !!partyId,
    ...QUERY_DEFAULTS,
  });
}

export function usePartyPayouts(partyId: string) {
  return useQuery({
    queryKey: agreementKeys.payouts(partyId),
    queryFn: () => getPartyPayouts(partyId),
    enabled: !!partyId,
    ...QUERY_DEFAULTS,
  });
}

// ── Commission Mutations ─────────────────────────────────────────────────────

export function useCreateCommissionAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommissionAgreementPayload) => createCommissionAgreement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.commissions });
    },
  });
}

export function useActivateCommissionAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => activateCommissionAgreement(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.commissions });
    },
  });
}

export function useCalculatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, params }: { code: string; params: CalculatePayoutParams }) =>
      calculatePayout(code, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.commissions });
    },
  });
}

export function useApprovePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payoutCode: string) => approvePayout(payoutCode),
    onSuccess: () => {
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'commission-payouts',
      });
      qc.invalidateQueries({ queryKey: agreementKeys.commissions });
    },
  });
}

// ── Discount Queries ─────────────────────────────────────────────────────────

export function useDiscountSchemes() {
  return useQuery({
    queryKey: agreementKeys.discounts,
    queryFn: getDiscountSchemes,
    ...QUERY_DEFAULTS,
  });
}

export function useActiveDiscounts() {
  return useQuery({
    queryKey: agreementKeys.activeDiscounts,
    queryFn: getActiveDiscounts,
    ...QUERY_DEFAULTS,
  });
}

export function useDiscountEvaluation() {
  return useQuery({
    queryKey: agreementKeys.discountEvaluation,
    queryFn: getDiscountEvaluation,
    ...QUERY_DEFAULTS,
  });
}

export function useDiscountUtilization() {
  return useQuery({
    queryKey: agreementKeys.discountUtilization,
    queryFn: getDiscountUtilization,
    ...QUERY_DEFAULTS,
  });
}

// ── Discount Mutations ───────────────────────────────────────────────────────

export function useCreateDiscountScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDiscountSchemePayload) => createDiscountScheme(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.discounts });
      qc.invalidateQueries({ queryKey: agreementKeys.activeDiscounts });
    },
  });
}

export function useEvaluateDiscount() {
  return useMutation({
    mutationFn: ({
      customerId,
      feeCode,
      amount,
    }: {
      customerId: number;
      feeCode: string;
      amount: number;
    }) => evaluateDiscount(customerId, feeCode, amount),
  });
}

// ── Special Pricing Queries ──────────────────────────────────────────────────

export function useSpecialPricingAgreements() {
  return useQuery({
    queryKey: agreementKeys.specialPricing,
    queryFn: getSpecialPricingAgreements,
    ...QUERY_DEFAULTS,
  });
}

export function useCustomerSpecialPricing(customerId: number) {
  return useQuery({
    queryKey: agreementKeys.customerSpecialPricing(customerId),
    queryFn: () => getCustomerSpecialPricing(customerId),
    enabled: !!customerId,
    ...QUERY_DEFAULTS,
  });
}

// ── Special Pricing Mutations ────────────────────────────────────────────────

export function useCreateSpecialPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSpecialPricingPayload) => createSpecialPricing(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.specialPricing });
    },
  });
}

export function useReviewSpecialPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reviewSpecialPricing(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.specialPricing });
    },
  });
}

// ── Templates Query ──────────────────────────────────────────────────────────

export function useAgreementTemplates() {
  return useQuery({
    queryKey: agreementKeys.templates,
    queryFn: getAgreementTemplates,
    ...QUERY_DEFAULTS,
    staleTime: 5 * 60_000, // templates rarely change
  });
}

export function useTdFrameworks() {
  return useQuery({
    queryKey: agreementKeys.tdFrameworks,
    queryFn: getTdFrameworks,
    ...QUERY_DEFAULTS,
  });
}

export function useTdFramework(agreementNumber: string) {
  return useQuery({
    queryKey: [...agreementKeys.tdFrameworks, agreementNumber],
    queryFn: () => getTdFramework(agreementNumber),
    enabled: !!agreementNumber,
    ...QUERY_DEFAULTS,
  });
}

// useTdMaturityLadder, useTdRolloverForecast, useTdHistory removed — use useMaturityLadder, useRolloverForecast, useTdSummaryHistory instead

export function useCommissionAgreement(code: string) {
  return useQuery({
    queryKey: ['commission-agreement', code],
    queryFn: () => apiGet<CommissionAgreement>(`/api/v1/commissions/agreements/${code}`),
    enabled: !!code,
  });
}

export function useAgreement(id: number) {
  return useQuery({
    queryKey: ['agreement', id],
    queryFn: () => apiGet<CustomerAgreement>(`/api/v1/agreements/${id}`),
    enabled: !!id && id > 0,
  });
}

export function useUpdateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CustomerAgreement> }) =>
      apiPut<CustomerAgreement>(`/api/v1/agreements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agreements'] }),
  });
}
