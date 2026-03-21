import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { acquiringApi } from '../api/acquiringApi';

const QK = {
  activeMerchants: ['acquiring', 'merchants', 'active'] as const,
  highRiskMerchants: ['acquiring', 'merchants', 'high-risk'] as const,
  merchantFacilities: (merchantId: number) =>
    ['acquiring', 'facilities', 'merchant', merchantId] as const,
  merchantSettlements: (merchantId: number) =>
    ['acquiring', 'settlements', 'merchant', merchantId] as const,
  chargebacks: ['acquiring', 'chargebacks'] as const,
  pciCompliance: ['acquiring', 'compliance', 'pci'] as const,
};

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

export function useMerchantFacilities(merchantId: number) {
  return useQuery({
    queryKey: QK.merchantFacilities(merchantId),
    queryFn: () => acquiringApi.getMerchantFacilities(merchantId),
    enabled: !!merchantId,
  });
}

export function useMerchantSettlements(merchantId: number) {
  return useQuery({
    queryKey: QK.merchantSettlements(merchantId),
    queryFn: () => acquiringApi.getMerchantSettlements(merchantId),
    enabled: !!merchantId,
  });
}

export function useChargebacks() {
  return useQuery({
    queryKey: QK.chargebacks,
    queryFn: () => acquiringApi.getChargebacks(),
    staleTime: 30_000,
  });
}

export function usePciCompliance() {
  return useQuery({
    queryKey: QK.pciCompliance,
    queryFn: () => acquiringApi.getPciComplianceReport(),
    staleTime: 5 * 60_000,
  });
}

export function useOnboardMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof acquiringApi.onboardMerchant>[0]) =>
      acquiringApi.onboardMerchant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.activeMerchants });
    },
  });
}

export function useActivateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => acquiringApi.activateMerchant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.activeMerchants });
    },
  });
}

export function useSuspendMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      acquiringApi.suspendMerchant(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.activeMerchants });
      queryClient.invalidateQueries({ queryKey: QK.highRiskMerchants });
    },
  });
}

export function useProcessSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ merchantId, date }: { merchantId: number; date: string }) =>
      acquiringApi.processSettlement(merchantId, date),
    onSuccess: (_, { merchantId }) => {
      queryClient.invalidateQueries({
        queryKey: QK.merchantSettlements(merchantId),
      });
    },
  });
}

export function useRecordChargeback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof acquiringApi.recordChargeback>[0]) =>
      acquiringApi.recordChargeback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.chargebacks });
    },
  });
}

export function useSetupFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof acquiringApi.setupFacility>[0]) =>
      acquiringApi.setupFacility(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquiring', 'facilities'] });
    },
  });
}

export function useActivateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => acquiringApi.activateFacility(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquiring', 'facilities'] });
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
