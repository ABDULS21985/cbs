import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { advisoryApi } from '../api/advisoryApi';

// ─── Query key constants ──────────────────────────────────────────────────────

export const QK = {
  // M&A
  maAll: ['advisory', 'ma-advisory', 'all'] as const,
  maActive: ['advisory', 'ma-advisory', 'active'] as const,
  maPipeline: ['advisory', 'ma-advisory', 'pipeline'] as const,
  maWorkload: ['advisory', 'ma-advisory', 'workload'] as const,
  maRevenue: (from: string, to: string) => ['advisory', 'ma-advisory', 'revenue', from, to] as const,

  // Tax
  taxAll: ['advisory', 'tax-advisory', 'all'] as const,
  taxActive: ['advisory', 'tax-advisory', 'active'] as const,
  taxRevenue: (from: string, to: string) => ['advisory', 'tax-advisory', 'revenue', from, to] as const,

  // Corporate Finance
  corporateFinanceAll: ['advisory', 'corporate-finance', 'all'] as const,
  corporateFinanceActive: ['advisory', 'corporate-finance', 'active'] as const,
  corporateFinancePipeline: ['advisory', 'corporate-finance', 'pipeline'] as const,
  corporateFinanceRevenue: (from: string, to: string) =>
    ['advisory', 'corporate-finance', 'revenue', from, to] as const,

  // Project Finance
  projectFacilitiesAll: ['advisory', 'project-finance', 'all'] as const,
  projectFacilitiesByStatus: (status: string) =>
    ['advisory', 'project-finance', 'status', status] as const,
  facilityMilestones: (code: string) =>
    ['advisory', 'project-finance', 'milestones', code] as const,

  // Suitability
  suitabilityProfiles: ['advisory', 'suitability', 'profiles'] as const,
  suitabilityProfile: (customerId: number) =>
    ['advisory', 'suitability', 'profile', customerId] as const,
  expiredProfiles: ['advisory', 'suitability', 'expired'] as const,
  suitabilityChecks: ['advisory', 'suitability', 'checks'] as const,
  checkHistory: (customerId: number) =>
    ['advisory', 'suitability', 'checks', 'customer', customerId] as const,
};

// ─── M&A Advisory hooks ───────────────────────────────────────────────────────

export function useAllMaEngagements() {
  return useQuery({
    queryKey: QK.maAll,
    queryFn: () => advisoryApi.getAllMaEngagements(),
  });
}

export function useMaAdvisoryMandates() {
  return useQuery({
    queryKey: QK.maActive,
    queryFn: () => advisoryApi.getMaAdvisoryActive(),
  });
}

export function useMaAdvisoryPipeline() {
  return useQuery({
    queryKey: QK.maPipeline,
    queryFn: () => advisoryApi.getMaAdvisoryPipeline(),
  });
}

export function useMaAdvisoryWorkload() {
  return useQuery({
    queryKey: QK.maWorkload,
    queryFn: () => advisoryApi.getMaAdvisoryWorkload(),
  });
}

export function useMaAdvisoryRevenue(from: string, to: string) {
  return useQuery({
    queryKey: QK.maRevenue(from, to),
    queryFn: () => advisoryApi.getMaAdvisoryRevenue(from, to),
    enabled: Boolean(from && to),
  });
}

export function useCreateMaEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createMaEngagement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.maAll });
      qc.invalidateQueries({ queryKey: QK.maActive });
      qc.invalidateQueries({ queryKey: QK.maPipeline });
    },
  });
}

export function useUpdateMaMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, field, date }: { code: string; field: string; date: string }) =>
      advisoryApi.updateMaMilestone(code, field, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.maAll });
      qc.invalidateQueries({ queryKey: QK.maActive });
    },
  });
}

export function useRecordMaFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, amount }: { code: string; amount: number }) =>
      advisoryApi.recordMaFee(code, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.maAll });
      qc.invalidateQueries({ queryKey: QK.maActive });
    },
  });
}

export function useCloseMaEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, actualDealValue }: { code: string; actualDealValue: number }) =>
      advisoryApi.closeMaEngagement(code, actualDealValue),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.maAll });
      qc.invalidateQueries({ queryKey: QK.maActive });
      qc.invalidateQueries({ queryKey: QK.maPipeline });
    },
  });
}

export function useTerminateMaEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, reason }: { code: string; reason?: string }) =>
      advisoryApi.terminateMaEngagement(code, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.maAll });
      qc.invalidateQueries({ queryKey: QK.maActive });
      qc.invalidateQueries({ queryKey: QK.maPipeline });
    },
  });
}

// ─── Tax Advisory hooks ───────────────────────────────────────────────────────

export function useAllTaxEngagements() {
  return useQuery({
    queryKey: QK.taxAll,
    queryFn: () => advisoryApi.getAllTaxEngagements(),
  });
}

export function useTaxAdvisoryEngagements() {
  return useQuery({
    queryKey: QK.taxActive,
    queryFn: () => advisoryApi.getTaxAdvisoryActive(),
  });
}

export function useTaxAdvisoryRevenue(from: string, to: string) {
  return useQuery({
    queryKey: QK.taxRevenue(from, to),
    queryFn: () => advisoryApi.getTaxAdvisoryRevenue(from, to),
    enabled: Boolean(from && to),
    retry: false,
  });
}

export function useCreateTaxEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createTaxEngagement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.taxAll });
      qc.invalidateQueries({ queryKey: QK.taxActive });
    },
  });
}

export function useDeliverOpinion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, opinion }: { code: string; opinion: string }) =>
      advisoryApi.deliverOpinion(code, opinion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.taxAll });
      qc.invalidateQueries({ queryKey: QK.taxActive });
    },
  });
}

export function useCloseTaxEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => advisoryApi.closeTaxEngagement(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.taxAll });
      qc.invalidateQueries({ queryKey: QK.taxActive });
    },
  });
}

// ─── Corporate Finance hooks ──────────────────────────────────────────────────

export function useAllCorporateFinanceEngagements() {
  return useQuery({
    queryKey: QK.corporateFinanceAll,
    queryFn: () => advisoryApi.getAllCorporateFinanceEngagements(),
    retry: false,
  });
}

export function useCorporateFinanceMandates() {
  return useQuery({
    queryKey: QK.corporateFinanceActive,
    queryFn: () => advisoryApi.getCorporateFinanceActive(),
    retry: false,
  });
}

export function useCorporateFinancePipeline() {
  return useQuery({
    queryKey: QK.corporateFinancePipeline,
    queryFn: () => advisoryApi.getCorporateFinancePipeline(),
    retry: false,
  });
}

export function useCorporateFinanceRevenue(from: string, to: string) {
  return useQuery({
    queryKey: QK.corporateFinanceRevenue(from, to),
    queryFn: () => advisoryApi.getCorporateFinanceRevenue(from, to),
    enabled: Boolean(from && to),
    retry: false,
  });
}

export function useCreateCFEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createCorporateFinanceEngagement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceAll });
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
      qc.invalidateQueries({ queryKey: QK.corporateFinancePipeline });
    },
  });
}

export function useDeliverDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => advisoryApi.deliverDraft(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceAll });
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
    },
  });
}

export function useFinalizeDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => advisoryApi.finalizeDelivery(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceAll });
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
    },
  });
}

export function useRecordFeeInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, amount }: { code: string; amount: number }) =>
      advisoryApi.recordFeeInvoice(code, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceAll });
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, amount }: { code: string; amount: number }) =>
      advisoryApi.recordPayment(code, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceAll });
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
    },
  });
}

export function useCloseCFEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => advisoryApi.closeCorporateFinanceEngagement(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceAll });
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
      qc.invalidateQueries({ queryKey: QK.corporateFinancePipeline });
    },
  });
}

// ─── Project Finance hooks ────────────────────────────────────────────────────

export function useAllProjectFacilities() {
  return useQuery({
    queryKey: QK.projectFacilitiesAll,
    queryFn: () => advisoryApi.getAllProjectFacilities(),
    retry: false,
  });
}

export function useProjectFacilitiesByStatus(status: string) {
  return useQuery({
    queryKey: QK.projectFacilitiesByStatus(status),
    queryFn: () => advisoryApi.getProjectFacilitiesByStatus(status),
    enabled: Boolean(status),
    retry: false,
  });
}

export function useFacilityMilestones(code: string) {
  return useQuery({
    queryKey: QK.facilityMilestones(code),
    queryFn: () => advisoryApi.getFacilityMilestones(code),
    enabled: Boolean(code),
    retry: false,
  });
}

export function useCreateProjectFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createProjectFacility,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'project-finance'] });
    },
  });
}

export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: Parameters<typeof advisoryApi.addMilestone>[1] }) =>
      advisoryApi.addMilestone(code, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'project-finance'] });
    },
  });
}

export function useCompleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneCode: string) => advisoryApi.completeMilestone(milestoneCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'project-finance'] });
    },
  });
}

// ─── Suitability hooks ────────────────────────────────────────────────────────

export function useAllProfiles() {
  return useQuery({
    queryKey: QK.suitabilityProfiles,
    queryFn: () => advisoryApi.getAllProfiles(),
    retry: false,
  });
}

export function useSuitabilityProfile(customerId: number) {
  return useQuery({
    queryKey: QK.suitabilityProfile(customerId),
    queryFn: () => advisoryApi.getSuitabilityProfile(customerId),
    enabled: Boolean(customerId),
    retry: false,
  });
}

export function useExpiredProfiles() {
  return useQuery({
    queryKey: QK.expiredProfiles,
    queryFn: () => advisoryApi.getExpiredProfiles(),
    retry: false,
  });
}

export function useAllChecks() {
  return useQuery({
    queryKey: QK.suitabilityChecks,
    queryFn: () => advisoryApi.getAllChecks(),
    retry: false,
  });
}

export function useCreateSuitabilityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createSuitabilityProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'suitability'] });
    },
  });
}

export function useUpdateSuitabilityProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: Parameters<typeof advisoryApi.updateSuitabilityProfile>[1] }) =>
      advisoryApi.updateSuitabilityProfile(code, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'suitability'] });
    },
  });
}

export function usePerformSuitabilityCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.performSuitabilityCheck,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'suitability'] });
    },
  });
}

export function useOverrideCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, justification, approver }: { ref: string; justification: string; approver: string }) =>
      advisoryApi.overrideCheck(ref, justification, approver),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'suitability'] });
    },
  });
}

export function useAcknowledgeDisclosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => advisoryApi.acknowledgeDisclosure(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'suitability'] });
    },
  });
}
