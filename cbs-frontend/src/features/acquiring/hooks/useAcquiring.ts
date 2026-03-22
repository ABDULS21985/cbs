import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { acquiringApi } from '../api/acquiringApi';
import type { RecordChargebackPayload, SetupFacilityPayload, RegisterTerminalPayload } from '../api/acquiringApi';

const QK = {
  activeMerchants: ['acquiring', 'merchants', 'active'] as const,
  highRiskMerchants: ['acquiring', 'merchants', 'high-risk'] as const,
  allMerchants: ['acquiring', 'merchants', 'all'] as const,
  merchantFacilities: (merchantId: number) =>
    ['acquiring', 'facilities', 'merchant', merchantId] as const,
  merchantSettlements: (merchantId: number) =>
    ['acquiring', 'settlements', 'merchant', merchantId] as const,
  chargebacks: ['acquiring', 'chargebacks'] as const,
  pciCompliance: ['acquiring', 'compliance', 'pci'] as const,
  facilities: ['acquiring', 'facilities'] as const,
  settlements: ['acquiring', 'settlements'] as const,
  terminals: ['acquiring', 'terminals'] as const,
};

// ── Merchant Queries ─────────────────────────────────────────────────────────

export function useActiveMerchants() {
  return useQuery({
    queryKey: QK.activeMerchants,
    queryFn: () => acquiringApi.getActiveMerchants(),
    staleTime: 30_000,
  });
}

export function useHighRiskMerchants() {
  return useQuery({
    queryKey: QK.highRiskMerchants,
    queryFn: () => acquiringApi.getHighRiskMerchants(),
    staleTime: 30_000,
  });
}

export function useAllMerchants() {
  return useQuery({
    queryKey: QK.allMerchants,
    queryFn: () => acquiringApi.getAllMerchants(),
    staleTime: 30_000,
  });
}

// ── Facility Queries ─────────────────────────────────────────────────────────

export function useMerchantFacilities(merchantId: number) {
  return useQuery({
    queryKey: QK.merchantFacilities(merchantId),
    queryFn: () => acquiringApi.getMerchantFacilities(merchantId),
    enabled: !!merchantId,
  });
}

// ── Settlement Queries ───────────────────────────────────────────────────────

export function useMerchantSettlements(merchantId: number) {
  return useQuery({
    queryKey: QK.merchantSettlements(merchantId),
    queryFn: () => acquiringApi.getMerchantSettlements(merchantId),
    enabled: !!merchantId,
  });
}

// ── Chargeback Queries ───────────────────────────────────────────────────────

export function useChargebacks() {
  return useQuery({
    queryKey: QK.chargebacks,
    queryFn: () => acquiringApi.getChargebacks(),
    staleTime: 30_000,
  });
}

// ── PCI Compliance ───────────────────────────────────────────────────────────

export function usePciCompliance() {
  return useQuery({
    queryKey: QK.pciCompliance,
    queryFn: () => acquiringApi.getPciComplianceReport(),
    staleTime: 5 * 60_000,
  });
}

// ── POS Terminal Queries ─────────────────────────────────────────────────────

export function useAllTerminals() {
  return useQuery({
    queryKey: QK.terminals,
    queryFn: () => acquiringApi.getAllTerminals(),
    staleTime: 30_000,
  });
}

// ── Merchant Mutations ───────────────────────────────────────────────────────

export function useOnboardMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof acquiringApi.onboardMerchant>[0]) =>
      acquiringApi.onboardMerchant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.activeMerchants });
      queryClient.invalidateQueries({ queryKey: QK.allMerchants });
    },
  });
}

/** activate expects the merchantId STRING (e.g. "MCH-ABCDEF1234") */
export function useActivateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (merchantId: string) => acquiringApi.activateMerchant(merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.activeMerchants });
      queryClient.invalidateQueries({ queryKey: QK.allMerchants });
    },
  });
}

/** suspend expects the merchantId STRING + reason */
export function useSuspendMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ merchantId, reason }: { merchantId: string; reason: string }) =>
      acquiringApi.suspendMerchant(merchantId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.activeMerchants });
      queryClient.invalidateQueries({ queryKey: QK.highRiskMerchants });
      queryClient.invalidateQueries({ queryKey: QK.allMerchants });
    },
  });
}

// ── Settlement Mutations ─────────────────────────────────────────────────────

/** processSettlement takes merchantId (number) + single date (ISO string) */
export function useProcessSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ merchantId, date }: { merchantId: number; date: string }) =>
      acquiringApi.processSettlement(merchantId, date),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({ queryKey: QK.merchantSettlements(merchantId) });
      queryClient.invalidateQueries({ queryKey: QK.settlements });
    },
  });
}

// ── Chargeback Mutations ─────────────────────────────────────────────────────

export function useRecordChargeback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordChargebackPayload) =>
      acquiringApi.recordChargeback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.chargebacks });
    },
  });
}

export function useSubmitRepresentment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, responseRef, evidence }: { id: number; responseRef: string; evidence: Record<string, unknown> }) =>
      acquiringApi.submitRepresentment(id, responseRef, evidence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.chargebacks });
    },
  });
}

// ── Facility Mutations ───────────────────────────────────────────────────────

export function useSetupFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetupFacilityPayload) =>
      acquiringApi.setupFacility(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.facilities });
    },
  });
}

export function useActivateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => acquiringApi.activateFacility(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.facilities });
    },
  });
}

// ── POS Terminal Mutations ───────────────────────────────────────────────────

export function useRegisterTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterTerminalPayload) =>
      acquiringApi.registerTerminal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.terminals });
    },
  });
}

export function useUpdateTerminalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ terminalId, status }: { terminalId: string; status: string }) =>
      acquiringApi.updateTerminalStatus(terminalId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.terminals });
    },
  });
}
