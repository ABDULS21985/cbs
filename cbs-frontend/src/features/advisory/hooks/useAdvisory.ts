import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { advisoryApi, type ProjectFinanceStatus } from '../api/advisoryApi';

// ─── Query key constants ──────────────────────────────────────────────────────

const QK = {
  corporateFinanceActive: ['advisory', 'corporate-finance', 'active'] as const,
  corporateFinancePipeline: ['advisory', 'corporate-finance', 'pipeline'] as const,
  corporateFinanceRevenue: (from: string, to: string) =>
    ['advisory', 'corporate-finance', 'revenue', from, to] as const,
  projectFacilities: (status?: ProjectFinanceStatus) =>
    ['advisory', 'project-finance', 'facilities', status] as const,
  facilityMilestones: (code: string) =>
    ['advisory', 'project-finance', 'milestones', code] as const,
  maAdvisoryActive: ['advisory', 'ma-advisory', 'active'] as const,
  maAdvisoryPipeline: ['advisory', 'ma-advisory', 'pipeline'] as const,
  maAdvisoryRevenue: (from: string, to: string) =>
    ['advisory', 'ma-advisory', 'revenue', from, to] as const,
  taxAdvisoryActive: ['advisory', 'tax-advisory', 'active'] as const,
  suitabilityProfile: (customerId: number) =>
    ['advisory', 'suitability', 'profile', customerId] as const,
  expiredProfiles: ['advisory', 'suitability', 'expired'] as const,
};

// ─── Corporate Finance hooks ──────────────────────────────────────────────────

export function useCorporateFinanceMandates() {
  return useQuery({
    queryKey: QK.corporateFinanceActive,
    queryFn: () => advisoryApi.getCorporateFinanceActive(),
  });
}

export function useCorporateFinancePipeline() {
  return useQuery({
    queryKey: QK.corporateFinancePipeline,
    queryFn: () => advisoryApi.getCorporateFinancePipeline(),
  });
}

export function useCorporateFinanceRevenue(from: string, to: string) {
  return useQuery({
    queryKey: QK.corporateFinanceRevenue(from, to),
    queryFn: () => advisoryApi.getCorporateFinanceRevenue(from, to),
    enabled: Boolean(from && to),
  });
}

export function useCreateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createCorporateFinanceEngagement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
      qc.invalidateQueries({ queryKey: QK.corporateFinancePipeline });
    },
  });
}

export function useCloseEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => advisoryApi.closeCorporateFinanceEngagement(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.corporateFinanceActive });
    },
  });
}

export function useDeliverDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: Parameters<typeof advisoryApi.deliverDraft>[1] }) =>
      advisoryApi.deliverDraft(code, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.corporateFinanceActive }),
  });
}

export function useFinalizeDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => advisoryApi.finalizeDelivery(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.corporateFinanceActive }),
  });
}

export function useRecordFeeInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: Parameters<typeof advisoryApi.recordFeeInvoice>[1] }) =>
      advisoryApi.recordFeeInvoice(code, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.corporateFinanceActive }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: Parameters<typeof advisoryApi.recordPayment>[1] }) =>
      advisoryApi.recordPayment(code, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.corporateFinanceActive }),
  });
}

// ─── Project Finance hooks ────────────────────────────────────────────────────

export function useProjectFacilities(status?: ProjectFinanceStatus) {
  return useQuery({
    queryKey: QK.projectFacilities(status),
    queryFn: () => advisoryApi.getProjectFacilities(status),
  });
}

export function useFacilityMilestones(code: string) {
  return useQuery({
    queryKey: QK.facilityMilestones(code),
    queryFn: () => advisoryApi.getFacilityMilestones(code),
    enabled: Boolean(code),
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

export function useCompleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneCode, payload }: { milestoneCode: string; payload: Parameters<typeof advisoryApi.completeMilestone>[1] }) =>
      advisoryApi.completeMilestone(milestoneCode, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'project-finance'] });
    },
  });
}

// ─── M&A Advisory hooks ───────────────────────────────────────────────────────

export function useMaAdvisoryMandates() {
  return useQuery({
    queryKey: QK.maAdvisoryActive,
    queryFn: () => advisoryApi.getMaAdvisoryActive(),
  });
}

export function useMaAdvisoryPipeline() {
  return useQuery({
    queryKey: QK.maAdvisoryPipeline,
    queryFn: () => advisoryApi.getMaAdvisoryPipeline(),
  });
}

export function useMaAdvisoryRevenue(from: string, to: string) {
  return useQuery({
    queryKey: QK.maAdvisoryRevenue(from, to),
    queryFn: () => advisoryApi.getMaAdvisoryRevenue(from, to),
    enabled: Boolean(from && to),
  });
}

export function useCreateMaEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createMaEngagement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.maAdvisoryActive });
      qc.invalidateQueries({ queryKey: QK.maAdvisoryPipeline });
    },
  });
}

// ─── Tax Advisory hooks ───────────────────────────────────────────────────────

export function useTaxAdvisoryEngagements() {
  return useQuery({
    queryKey: QK.taxAdvisoryActive,
    queryFn: () => advisoryApi.getTaxAdvisoryActive(),
  });
}

export function useCreateTaxEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.createTaxEngagement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.taxAdvisoryActive });
    },
  });
}

// ─── Suitability hooks ────────────────────────────────────────────────────────

export function useSuitabilityProfile(customerId: number) {
  return useQuery({
    queryKey: QK.suitabilityProfile(customerId),
    queryFn: () => advisoryApi.getSuitabilityProfile(customerId),
    enabled: Boolean(customerId),
  });
}

export function useExpiredProfiles() {
  return useQuery({
    queryKey: QK.expiredProfiles,
    queryFn: () => advisoryApi.getExpiredProfiles(),
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

export function usePerformSuitabilityCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advisoryApi.performSuitabilityCheck,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advisory', 'suitability'] });
    },
  });
}
