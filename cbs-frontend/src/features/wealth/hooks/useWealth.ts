import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wealthApi } from '../api/wealthApi';
import type { BeneficiaryCreateRequest, ClientMatchRequest, AdvisorReview, ScheduledDistribution, TrustDocument } from '../api/wealthApi';

// ─── Query Keys ────────────────────────────────────────────────────────────

const KEYS = {
  advisors: () => ['wealth', 'advisors'] as const,
  advisor: (id: string) => ['wealth', 'advisors', id] as const,
  advisorPerformance: (id: string) => ['wealth', 'advisors', id, 'performance'] as const,
  advisorClients: (id: string) => ['wealth', 'advisors', id, 'clients'] as const,
  advisorReviews: (id: string) => ['wealth', 'advisors', id, 'reviews'] as const,
  advisorCertifications: (id: string) => ['wealth', 'advisors', id, 'certifications'] as const,
  plans: (filters?: Record<string, unknown>) => ['wealth', 'plans', filters] as const,
  plan: (code: string) => ['wealth', 'plans', code] as const,
  planPerformance: (code: string) => ['wealth', 'plans', code, 'performance'] as const,
  trusts: (filters?: Record<string, unknown>) => ['wealth', 'trusts', filters] as const,
  trust: (code: string) => ['wealth', 'trusts', code] as const,
  trustDistributions: (code: string) => ['wealth', 'trusts', code, 'distributions'] as const,
  trustScheduledDist: (code: string) => ['wealth', 'trusts', code, 'scheduled-distributions'] as const,
  trustCompliance: (code: string) => ['wealth', 'trusts', code, 'compliance'] as const,
  trustDocuments: (code: string) => ['wealth', 'trusts', code, 'documents'] as const,
  trustAnalytics: () => ['wealth', 'trusts', 'analytics'] as const,
  aumTrend: (months: number) => ['wealth', 'analytics', 'aum-trend', months] as const,
  aumWaterfall: (period?: string) => ['wealth', 'analytics', 'aum-waterfall', period] as const,
  aumBySegment: (months?: number) => ['wealth', 'analytics', 'aum-by-segment', months] as const,
  concentrationRisk: () => ['wealth', 'analytics', 'concentration-risk'] as const,
  flowAnalysis: (months?: number) => ['wealth', 'analytics', 'flow-analysis', months] as const,
  performanceAttribution: () => ['wealth', 'analytics', 'performance-attribution'] as const,
  clientSegments: () => ['wealth', 'analytics', 'client-segments'] as const,
  riskHeatmap: () => ['wealth', 'analytics', 'risk-heatmap'] as const,
  stressScenarios: () => ['wealth', 'analytics', 'stress-scenarios'] as const,
  feeRevenue: (months?: number) => ['wealth', 'analytics', 'fee-revenue', months] as const,
  insights: () => ['wealth', 'analytics', 'insights'] as const,
};

// ─── Advisor Hooks ─────────────────────────────────────────────────────────

export function useAdvisors() {
  return useQuery({
    queryKey: KEYS.advisors(),
    queryFn: () => wealthApi.getAdvisors(),
    staleTime: 60_000,
  });
}

export function useAdvisor(id: string) {
  return useQuery({
    queryKey: KEYS.advisor(id),
    queryFn: () => wealthApi.getAdvisor(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useAdvisorPerformance(id: string) {
  return useQuery({
    queryKey: KEYS.advisorPerformance(id),
    queryFn: () => wealthApi.getAdvisorPerformance(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useAdvisorClients(id: string) {
  return useQuery({
    queryKey: KEYS.advisorClients(id),
    queryFn: () => wealthApi.getAdvisorClients(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useAdvisorReviews(id: string) {
  return useQuery({
    queryKey: KEYS.advisorReviews(id),
    queryFn: () => wealthApi.getAdvisorReviews(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useScheduleReview(advisorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AdvisorReview, 'id' | 'status'>) => wealthApi.scheduleReview(advisorId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.advisorReviews(advisorId) }); },
  });
}

export function useAdvisorCertifications(id: string) {
  return useQuery({
    queryKey: KEYS.advisorCertifications(id),
    queryFn: () => wealthApi.getAdvisorCertifications(id),
    enabled: !!id,
    staleTime: 120_000,
  });
}

export function useAssignAdvisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planCode, advisorId }: { planCode: string; advisorId: string }) =>
      wealthApi.assignAdvisor(planCode, advisorId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wealth'] }); },
  });
}

export function useMatchClient() {
  return useMutation({
    mutationFn: (data: ClientMatchRequest) => wealthApi.matchClient(data),
  });
}

// ─── Plan Hooks ────────────────────────────────────────────────────────────

export function useWealthPlans(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.plans(filters),
    queryFn: () => wealthApi.getPlans(filters),
    staleTime: 30_000,
  });
}

export function useWealthPlan(code: string) {
  return useQuery({
    queryKey: KEYS.plan(code),
    queryFn: () => wealthApi.getPlan(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

// ─── Trust Hooks ───────────────────────────────────────────────────────────

export function useTrusts(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.trusts(filters),
    queryFn: () => wealthApi.getTrusts(filters),
    staleTime: 30_000,
  });
}

export function useTrust(code: string) {
  return useQuery({
    queryKey: KEYS.trust(code),
    queryFn: () => wealthApi.getTrust(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useTrustDistributions(code: string) {
  return useQuery({
    queryKey: KEYS.trustDistributions(code),
    queryFn: () => wealthApi.getDistributions(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useRecordDistribution(trustCode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      wealthApi.recordDistribution(trustCode, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.trust(trustCode) });
      qc.invalidateQueries({ queryKey: KEYS.trustDistributions(trustCode) });
    },
  });
}

export function useAddBeneficiary(trustCode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BeneficiaryCreateRequest) => wealthApi.addBeneficiary(trustCode, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.trust(trustCode) }); },
  });
}

export function useUpdateBeneficiary(trustCode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BeneficiaryCreateRequest> }) =>
      wealthApi.updateBeneficiary(trustCode, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.trust(trustCode) }); },
  });
}

export function useRemoveBeneficiary(trustCode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wealthApi.removeBeneficiary(trustCode, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.trust(trustCode) }); },
  });
}

export function useScheduledDistributions(trustCode: string) {
  return useQuery({
    queryKey: KEYS.trustScheduledDist(trustCode),
    queryFn: () => wealthApi.getScheduledDistributions(trustCode),
    enabled: !!trustCode,
    staleTime: 30_000,
  });
}

export function useScheduleDistribution(trustCode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ScheduledDistribution, 'id' | 'status'>) =>
      wealthApi.scheduleDistribution(trustCode, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.trustScheduledDist(trustCode) }); },
  });
}

export function useTrustCompliance(trustCode: string) {
  return useQuery({
    queryKey: KEYS.trustCompliance(trustCode),
    queryFn: () => wealthApi.getTrustCompliance(trustCode),
    enabled: !!trustCode,
    staleTime: 60_000,
  });
}

export function useTrustDocuments(trustCode: string) {
  return useQuery({
    queryKey: KEYS.trustDocuments(trustCode),
    queryFn: () => wealthApi.getTrustDocuments(trustCode),
    enabled: !!trustCode,
    staleTime: 30_000,
  });
}

export function useUploadTrustDocument(trustCode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => wealthApi.uploadTrustDocument(trustCode, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.trustDocuments(trustCode) }); },
  });
}

export function useDeleteTrustDocument(trustCode: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => wealthApi.deleteTrustDocument(trustCode, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.trustDocuments(trustCode) }); },
  });
}

export function useTrustAnalytics() {
  return useQuery({
    queryKey: KEYS.trustAnalytics(),
    queryFn: () => wealthApi.getTrustAnalytics(),
    staleTime: 120_000,
  });
}

// ─── Analytics Hooks (W4) ──────────────────────────────────────────────────

export function useAumTrend(months = 12) {
  return useQuery({
    queryKey: KEYS.aumTrend(months),
    queryFn: () => wealthApi.getAumTrend(months),
    staleTime: 120_000,
  });
}

export function useAumWaterfall(period?: string) {
  return useQuery({
    queryKey: KEYS.aumWaterfall(period),
    queryFn: () => wealthApi.getAumWaterfall(period),
    staleTime: 120_000,
  });
}

export function useAumBySegment(months?: number) {
  return useQuery({
    queryKey: KEYS.aumBySegment(months),
    queryFn: () => wealthApi.getAumBySegment(months),
    staleTime: 120_000,
  });
}

export function useConcentrationRisk() {
  return useQuery({
    queryKey: KEYS.concentrationRisk(),
    queryFn: () => wealthApi.getConcentrationRisk(),
    staleTime: 120_000,
  });
}

export function useFlowAnalysis(months?: number) {
  return useQuery({
    queryKey: KEYS.flowAnalysis(months),
    queryFn: () => wealthApi.getFlowAnalysis(months),
    staleTime: 120_000,
  });
}

export function usePerformanceAttribution() {
  return useQuery({
    queryKey: KEYS.performanceAttribution(),
    queryFn: () => wealthApi.getPerformanceAttribution(),
    staleTime: 120_000,
  });
}

export function useClientSegments() {
  return useQuery({
    queryKey: KEYS.clientSegments(),
    queryFn: () => wealthApi.getClientSegments(),
    staleTime: 120_000,
  });
}

export function useRiskHeatmap() {
  return useQuery({
    queryKey: KEYS.riskHeatmap(),
    queryFn: () => wealthApi.getRiskHeatmap(),
    staleTime: 120_000,
  });
}

export function useStressScenarios() {
  return useQuery({
    queryKey: KEYS.stressScenarios(),
    queryFn: () => wealthApi.getStressScenarios(),
    staleTime: 120_000,
  });
}

export function useFeeRevenue(months?: number) {
  return useQuery({
    queryKey: KEYS.feeRevenue(months),
    queryFn: () => wealthApi.getFeeRevenue(months),
    staleTime: 120_000,
  });
}

export function usePredictiveInsights() {
  return useQuery({
    queryKey: KEYS.insights(),
    queryFn: () => wealthApi.getPredictiveInsights(),
    staleTime: 300_000,
  });
}
