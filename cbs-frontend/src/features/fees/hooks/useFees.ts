import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getFeeDefinitions, getFeeById, createFeeDefinition, updateFeeDefinition,
  previewFee, chargeFee, waiveFee, getAccountFeeHistory,
  getPendingWaivers, approveWaiver, rejectWaiver,
  getBulkFeeJobs,
  type FeeDefinition, type FeeCharge,
} from '../api/feeApi';

// ── Query Key Factory ───────────────────────────────────────────────────────

export const feeKeys = {
  all: ['fees'] as const,
  definitions: () => [...feeKeys.all, 'definitions'] as const,
  definition: (id: string) => [...feeKeys.all, 'definition', id] as const,
  chargeHistory: (accountId: string) => [...feeKeys.all, 'charges', accountId] as const,
  customerCharges: (customerId: string) => [...feeKeys.all, 'customer-charges', customerId] as const,
  waivers: ['fee-waivers'] as const,
  pendingWaivers: () => [...feeKeys.waivers, 'pending'] as const,
  bulkJobs: () => [...feeKeys.all, 'bulk-jobs'] as const,
  preview: (feeCode: string) => [...feeKeys.all, 'preview', feeCode] as const,
} as const;

const DEFAULTS = { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 } as const;

// ── Fee Definition Queries ──────────────────────────────────────────────────

export function useFeeDefinitions() {
  return useQuery({
    queryKey: feeKeys.definitions(),
    queryFn: getFeeDefinitions,
    ...DEFAULTS,
  });
}

export function useFeeDefinition(id: string) {
  return useQuery({
    queryKey: feeKeys.definition(id),
    queryFn: () => getFeeById(id),
    enabled: !!id,
    ...DEFAULTS,
  });
}

// ── Fee Definition Mutations ────────────────────────────────────────────────

export function useCreateFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<FeeDefinition, 'id' | 'createdAt'>) => createFeeDefinition(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.definitions() });
      toast.success('Fee definition created');
    },
    onError: () => toast.error('Failed to create fee definition'),
  });
}

export function useUpdateFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeDefinition> }) => updateFeeDefinition(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: feeKeys.definitions() });
      qc.invalidateQueries({ queryKey: feeKeys.definition(id) });
      toast.success('Fee definition updated');
    },
    onError: () => toast.error('Failed to update fee definition'),
  });
}

// ── Fee Charge Queries ──────────────────────────────────────────────────────

export function useAccountFeeHistory(accountId: string) {
  return useQuery({
    queryKey: feeKeys.chargeHistory(accountId),
    queryFn: () => getAccountFeeHistory(accountId),
    enabled: !!accountId,
    ...DEFAULTS,
  });
}

// ── Waiver Queries & Mutations ──────────────────────────────────────────────

export function usePendingWaivers() {
  return useQuery({
    queryKey: feeKeys.pendingWaivers(),
    queryFn: getPendingWaivers,
    ...DEFAULTS,
  });
}

export function useApproveFeeWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ waiverId, authorizedBy }: { waiverId: string; authorizedBy: string }) =>
      approveWaiver(waiverId, authorizedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.waivers });
      qc.invalidateQueries({ queryKey: feeKeys.all });
      toast.success('Waiver approved');
    },
    onError: () => toast.error('Failed to approve waiver'),
  });
}

export function useRejectFeeWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ waiverId, reason }: { waiverId: string; reason: string }) =>
      rejectWaiver(waiverId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.waivers });
      toast.success('Waiver rejected');
    },
    onError: () => toast.error('Failed to reject waiver'),
  });
}

// ── Fee Operations ──────────────────────────────────────────────────────────

export function useChargeFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ feeCode, accountId, amount, triggerRef }: { feeCode: string; accountId: string; amount: number; triggerRef?: string }) =>
      chargeFee(feeCode, accountId, amount, triggerRef),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.all });
      toast.success('Fee charged successfully');
    },
    onError: () => toast.error('Failed to charge fee'),
  });
}

export function useWaiveFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chargeLogId, waivedBy, reason }: { chargeLogId: string; waivedBy: string; reason: string }) =>
      waiveFee(chargeLogId, waivedBy, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.all });
      toast.success('Fee waived');
    },
    onError: () => toast.error('Failed to waive fee'),
  });
}

export function usePreviewFee(feeCode: string, amount: number) {
  return useQuery({
    queryKey: [...feeKeys.preview(feeCode), amount],
    queryFn: () => previewFee(feeCode, amount),
    enabled: !!feeCode && amount > 0,
    ...DEFAULTS,
  });
}

// ── Bulk Fee Jobs ───────────────────────────────────────────────────────────

export function useBulkFeeJobs() {
  return useQuery({
    queryKey: feeKeys.bulkJobs(),
    queryFn: getBulkFeeJobs,
    ...DEFAULTS,
  });
}

// ── Cross-Feature Integration Hooks ─────────────────────────────────────────

/**
 * Fee revenue summary — can be imported by Dashboard to show fee metrics.
 */
export function useFeeRevenueSummary() {
  const { data: fees = [], ...rest } = useFeeDefinitions();
  const { data: waivers = [] } = usePendingWaivers();

  const activeFees = Array.isArray(fees) ? fees.filter(f => f.status === 'ACTIVE') : [];

  return {
    ...rest,
    data: {
      totalRevenue: 0, // Would need charge log aggregation endpoint
      totalWaivers: waivers.length,
      netRevenue: 0,
      feeCount: activeFees.length,
    },
  };
}

/**
 * Customer fee history — can be used in Customer360's fee tab.
 * Uses account ID to fetch; for customer-level, iterate customer accounts.
 */
export function useCustomerFeeHistory(customerId: string) {
  // Note: Backend does not expose a customer-level fee history endpoint.
  // This would need to be per-account. Provided as a stub hook for integration.
  return useQuery({
    queryKey: feeKeys.customerCharges(customerId),
    queryFn: () => getAccountFeeHistory(customerId), // Falls back to account-level
    enabled: !!customerId,
    ...DEFAULTS,
  });
}
