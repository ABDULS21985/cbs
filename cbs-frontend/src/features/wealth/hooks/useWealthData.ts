import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { wealthApi, type PlanCreateRequest, type TrustCreateRequest, type WealthGoal } from '../api/wealthApi';
import { trustsApi } from '../api/trustExtApi';
import { wealthManagementApi } from '../api/wealthExtApi';
import { apiGet, apiPost } from '@/lib/api';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  plans: {
    all: ['wealth', 'plans'] as const,
    detail: (code: string) => ['wealth', 'plans', code] as const,
    performance: (code: string) => ['wealth', 'plans', code, 'performance'] as const,
    documents: (code: string) => ['wealth', 'plans', code, 'documents'] as const,
    byCustomer: (id: number) => ['wealth', 'plans', 'customer', id] as const,
    byAdvisor: (id: number) => ['wealth', 'plans', 'advisor', id] as const,
  },
  advisors: {
    all: ['wealth', 'advisors'] as const,
    detail: (id: string) => ['wealth', 'advisors', id] as const,
    leaderboard: ['wealth', 'advisors', 'leaderboard'] as const,
  },
  trusts: {
    all: ['wealth', 'trusts'] as const,
    detail: (code: string) => ['wealth', 'trusts', code] as const,
    distributions: (code: string) => ['wealth', 'trusts', code, 'distributions'] as const,
    byGrantor: (id: number) => ['wealth', 'trusts', 'grantor', id] as const,
    byType: (type: string) => ['wealth', 'trusts', 'type', type] as const,
  },
  analytics: {
    summary: ['wealth', 'analytics', 'summary'] as const,
    aumTrend: (months: number) => ['wealth', 'analytics', 'aum-trend', months] as const,
    segments: ['wealth', 'analytics', 'segments'] as const,
  },
} as const;

const STALE = 5 * 60_000; // 5 minutes
const GC = 30 * 60_000;   // 30 minutes

// ─── Plans ────────────────────────────────────────────────────────────────────

export function usePlans(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.plans.all, filters],
    queryFn: () => wealthApi.getPlans(filters),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function usePlan(code: string) {
  return useQuery({
    queryKey: KEYS.plans.detail(code),
    queryFn: () => wealthApi.getPlan(code),
    enabled: !!code,
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function usePlanPerformance(code: string) {
  return useQuery({
    queryKey: KEYS.plans.performance(code),
    queryFn: () => wealthApi.getPlanPerformance(code),
    enabled: !!code,
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function usePlanDocuments(code: string) {
  return useQuery({
    queryKey: KEYS.plans.documents(code),
    queryFn: () => wealthApi.getDocuments(code),
    enabled: !!code,
    staleTime: STALE,
    retry: 2,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PlanCreateRequest) => wealthApi.createPlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.plans.all });
      toast.success('Wealth plan created successfully');
    },
    onError: () => toast.error('Failed to create wealth plan'),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<PlanCreateRequest> }) =>
      wealthApi.updatePlan(code, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.plans.detail(vars.code) });
      qc.invalidateQueries({ queryKey: KEYS.plans.all });
      toast.success('Plan updated');
    },
    onError: () => toast.error('Failed to update plan'),
  });
}

export function useActivatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => wealthApi.activatePlan(code),
    onSuccess: (_data, code) => {
      qc.invalidateQueries({ queryKey: KEYS.plans.detail(code) });
      qc.invalidateQueries({ queryKey: KEYS.plans.all });
      toast.success('Plan activated');
    },
    onError: () => toast.error('Failed to activate plan'),
  });
}

export function useClosePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) =>
      wealthApi.closePlan(code, reason),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.plans.detail(vars.code) });
      qc.invalidateQueries({ queryKey: KEYS.plans.all });
      toast.success('Plan closed');
    },
    onError: () => toast.error('Failed to close plan'),
  });
}

export function useAddGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, goal }: { code: string; goal: Omit<WealthGoal, 'id'> }) =>
      wealthApi.addGoal(code, goal),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.plans.detail(vars.code) });
      toast.success('Goal added');
    },
    onError: () => toast.error('Failed to add goal'),
  });
}

export function useRebalancePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => wealthApi.rebalancePlan(code),
    onSuccess: (_data, code) => {
      qc.invalidateQueries({ queryKey: KEYS.plans.detail(code) });
      toast.success('Portfolio rebalanced');
    },
    onError: () => toast.error('Failed to rebalance portfolio'),
  });
}

export function useUploadPlanDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, file }: { code: string; file: File }) =>
      wealthApi.uploadDocument(code, file),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.plans.documents(vars.code) });
      toast.success('Document uploaded');
    },
    onError: () => toast.error('Failed to upload document'),
  });
}

// ─── Advisors ─────────────────────────────────────────────────────────────────

export function useAdvisors() {
  return useQuery({
    queryKey: KEYS.advisors.all,
    queryFn: () => wealthApi.getAdvisors(),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function useAdvisor(id: string) {
  return useQuery({
    queryKey: KEYS.advisors.detail(id),
    queryFn: () => wealthApi.getAdvisor(id),
    enabled: !!id,
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function useAdvisorLeaderboard() {
  return useQuery({
    queryKey: KEYS.advisors.leaderboard,
    queryFn: () => apiGet<Record<string, unknown>[]>('/api/v1/wealth-management/analytics/advisors'),
    staleTime: STALE,
    retry: 2,
  });
}

export function useCreateAdvisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<Record<string, unknown>>('/api/v1/wealth-management/advisors', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.advisors.all });
      toast.success('Advisor added successfully');
    },
    onError: () => toast.error('Failed to add advisor'),
  });
}

export function useScheduleReview() {
  return useMutation({
    mutationFn: ({ advisorId, data }: { advisorId: string; data: Record<string, unknown> }) =>
      apiPost<Record<string, unknown>>(
        `/api/v1/wealth-management/advisors/${advisorId}/reviews`,
        data,
      ),
    onSuccess: () => toast.success('Review scheduled'),
    onError: () => toast.error('Failed to schedule review'),
  });
}

// ─── Trusts ───────────────────────────────────────────────────────────────────

export function useTrusts(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...KEYS.trusts.all, filters],
    queryFn: () => wealthApi.getTrusts(filters),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function useTrust(code: string) {
  return useQuery({
    queryKey: KEYS.trusts.detail(code),
    queryFn: () => wealthApi.getTrust(code),
    enabled: !!code,
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function useTrustDistributions(code: string) {
  return useQuery({
    queryKey: KEYS.trusts.distributions(code),
    queryFn: () => wealthApi.getDistributions(code),
    enabled: !!code,
    staleTime: STALE,
    retry: 2,
  });
}

export function useTrustsByGrantor(grantorId: number) {
  return useQuery({
    queryKey: KEYS.trusts.byGrantor(grantorId),
    queryFn: () => trustsApi.getByGrantor(grantorId),
    enabled: !!grantorId,
    staleTime: STALE,
  });
}

export function useTrustsByType(type: string) {
  return useQuery({
    queryKey: KEYS.trusts.byType(type),
    queryFn: () => trustsApi.getByType(type),
    enabled: !!type,
    staleTime: STALE,
  });
}

export function useCreateTrust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TrustCreateRequest) => wealthApi.createTrust(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.trusts.all });
      toast.success('Trust account created');
    },
    onError: () => toast.error('Failed to create trust'),
  });
}

export function useUpdateTrust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<TrustCreateRequest> }) =>
      wealthApi.updateTrust(code, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.trusts.detail(vars.code) });
      qc.invalidateQueries({ queryKey: KEYS.trusts.all });
      toast.success('Trust updated');
    },
    onError: () => toast.error('Failed to update trust'),
  });
}

export function useRecordDistribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, amount, beneficiary }: { code: string; amount: number; beneficiary: string }) =>
      wealthApi.recordDistribution(code, amount, beneficiary),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.trusts.detail(vars.code) });
      qc.invalidateQueries({ queryKey: KEYS.trusts.distributions(vars.code) });
      qc.invalidateQueries({ queryKey: KEYS.trusts.all });
      toast.success('Distribution recorded');
    },
    onError: () => toast.error('Failed to record distribution'),
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useWealthAnalytics() {
  return useQuery({
    queryKey: KEYS.analytics.summary,
    queryFn: () => apiGet<Record<string, unknown>>('/api/v1/wealth-management/analytics/summary'),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function useAumTrend(months = 12) {
  return useQuery({
    queryKey: KEYS.analytics.aumTrend(months),
    queryFn: () => wealthApi.getAumTrend(months),
    staleTime: STALE,
    gcTime: GC,
    retry: 2,
  });
}

export function useClientSegments() {
  return useQuery({
    queryKey: KEYS.analytics.segments,
    queryFn: () => apiGet<Record<string, unknown>>('/api/v1/wealth-management/analytics/segments'),
    staleTime: STALE,
    retry: 2,
  });
}

// ─── Plans by customer/advisor (from ext API) ────────────────────────────────

export function useWealthPlansByCustomer(customerId: number) {
  return useQuery({
    queryKey: KEYS.plans.byCustomer(customerId),
    queryFn: () => wealthManagementApi.getByCustomer(customerId),
    enabled: !!customerId,
    staleTime: STALE,
  });
}

export function useWealthPlansByAdvisor(advisorId: number) {
  return useQuery({
    queryKey: KEYS.plans.byAdvisor(advisorId),
    queryFn: () => wealthManagementApi.getByAdvisor(advisorId),
    enabled: !!advisorId,
    staleTime: STALE,
  });
}
