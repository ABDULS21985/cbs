import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wealthApi } from '../api/wealthApi';

export const WQK = {
  plans: ['wealth', 'plans'] as const,
  plan: (code: string) => ['wealth', 'plans', code] as const,
  planPerf: (code: string) => ['wealth', 'plans', code, 'perf'] as const,
  customerPlans: (id: number) => ['wealth', 'customer', id] as const,
  advisors: ['wealth', 'advisors'] as const,
  advisor: (id: string) => ['wealth', 'advisors', id] as const,
  advisorPerf: (id: string) => ['wealth', 'advisors', id, 'perf'] as const,
  advisorClients: (id: string) => ['wealth', 'advisors', id, 'clients'] as const,
  advisorReviews: (id: string) => ['wealth', 'advisors', id, 'reviews'] as const,
  aumTrend: (m: number) => ['wealth', 'analytics', 'aum-trend', m] as const,
  aumWaterfall: ['wealth', 'analytics', 'aum-waterfall'] as const,
  aumBySegment: ['wealth', 'analytics', 'aum-by-segment'] as const,
  concentrationRisk: ['wealth', 'analytics', 'concentration-risk'] as const,
  flowAnalysis: (m: number) => ['wealth', 'analytics', 'flow-analysis', m] as const,
  performanceAttribution: ['wealth', 'analytics', 'performance-attribution'] as const,
  clientSegments: ['wealth', 'analytics', 'client-segments'] as const,
  riskHeatmap: ['wealth', 'analytics', 'risk-heatmap'] as const,
  stressScenarios: ['wealth', 'analytics', 'stress-scenarios'] as const,
  feeRevenue: (m: number) => ['wealth', 'analytics', 'fee-revenue', m] as const,
  insights: ['wealth', 'analytics', 'insights'] as const,
};

// ─── Plan queries ────────────────────────────────────────────────────────────

export function useWealthPlans() {
  return useQuery({ queryKey: WQK.plans, queryFn: () => wealthApi.listPlans() });
}

export function useWealthPlan(code: string) {
  return useQuery({
    queryKey: WQK.plan(code),
    queryFn: () => wealthApi.getPlan(code),
    enabled: Boolean(code),
  });
}

export function usePlanPerformance(code: string) {
  return useQuery({
    queryKey: WQK.planPerf(code),
    queryFn: () => wealthApi.getPlanPerformance(code),
    enabled: Boolean(code),
  });
}

// ─── Plan mutations ──────────────────────────────────────────────────────────

export function useCreateWealthPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wealthApi.createPlan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: WQK.plans }); },
  });
}

export function useActivatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => wealthApi.activatePlan(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: WQK.plans }); },
  });
}

export function useClosePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => wealthApi.closePlan(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: WQK.plans }); },
  });
}

export function useAssignAdvisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, advisorId }: { code: string; advisorId: string }) =>
      wealthApi.assignAdvisor(code, advisorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WQK.plans });
      qc.invalidateQueries({ queryKey: WQK.advisors });
    },
  });
}

export function useAddGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, goal }: { code: string; goal: Record<string, unknown> }) =>
      wealthApi.addGoal(code, goal),
    onSuccess: () => { qc.invalidateQueries({ queryKey: WQK.plans }); },
  });
}

export function useRebalancePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => wealthApi.rebalance(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: WQK.plans }); },
  });
}

// ─── Advisor queries ─────────────────────────────────────────────────────────

export function useWealthAdvisors() {
  return useQuery({ queryKey: WQK.advisors, queryFn: () => wealthApi.listAdvisors() });
}

export function useAdvisorPerformance(id: string) {
  return useQuery({
    queryKey: WQK.advisorPerf(id),
    queryFn: () => wealthApi.getAdvisorPerformance(id),
    enabled: Boolean(id),
  });
}

export function useAdvisorClients(id: string) {
  return useQuery({
    queryKey: WQK.advisorClients(id),
    queryFn: () => wealthApi.getAdvisorClients(id),
    enabled: Boolean(id),
  });
}

export function useCreateAdvisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wealthApi.createAdvisor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: WQK.advisors }); },
  });
}

// ─── Analytics queries ───────────────────────────────────────────────────────

export function useAumTrend(months = 12) {
  return useQuery({ queryKey: WQK.aumTrend(months), queryFn: () => wealthApi.getAumTrend(months) });
}

export function useAumBySegment() {
  return useQuery({ queryKey: WQK.aumBySegment, queryFn: () => wealthApi.getAumBySegment() });
}

export function useConcentrationRisk() {
  return useQuery({ queryKey: WQK.concentrationRisk, queryFn: () => wealthApi.getConcentrationRisk() });
}

export function useFlowAnalysis(months = 12) {
  return useQuery({ queryKey: WQK.flowAnalysis(months), queryFn: () => wealthApi.getFlowAnalysis(months) });
}

export function usePerformanceAttribution() {
  return useQuery({ queryKey: WQK.performanceAttribution, queryFn: () => wealthApi.getPerformanceAttribution() });
}

export function useRiskHeatmap() {
  return useQuery({ queryKey: WQK.riskHeatmap, queryFn: () => wealthApi.getRiskHeatmap() });
}

export function useStressScenarios() {
  return useQuery({ queryKey: WQK.stressScenarios, queryFn: () => wealthApi.getStressScenarios() });
}

export function useFeeRevenue(months = 12) {
  return useQuery({ queryKey: WQK.feeRevenue(months), queryFn: () => wealthApi.getFeeRevenue(months) });
}

export function useWealthInsights() {
  return useQuery({ queryKey: WQK.insights, queryFn: () => wealthApi.getInsights() });
}
