import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { almApi, type ActionItemStatus } from '../api/almApi';

const KEYS = {
  gapReportsByDate: (date: string) => ['alm', 'gap-reports', date],
  gapReports: () => ['alm', 'gap-reports'],
  positions: (date: string, currency: string) => ['alm', 'positions', date, currency],
  scenarios: () => ['alm', 'scenarios'],
  regulatoryScenarios: () => ['alm', 'scenarios', 'regulatory'],
  durationAnalytics: (portfolioCode: string) => ['alm', 'duration-analytics', portfolioCode],
  alcoPacks: () => ['alm', 'alco-packs'],
  alcoPack: (id: number) => ['alm', 'alco-pack', id],
  alcoPackByMonth: (month: string) => ['alm', 'alco-pack', 'month', month],
  alcoPackVersions: (month: string) => ['alm', 'alco-pack', 'versions', month],
  actionItems: () => ['alm', 'action-items'],
  regulatoryReturns: () => ['alm', 'regulatory-returns'],
  regulatoryReturn: (id: number) => ['alm', 'regulatory-return', id],
  returnSubmissions: (returnId: number) => ['alm', 'return-submissions', returnId],
  allSubmissions: () => ['alm', 'submissions'],
};

export function useAlmGapReportsByDate(date: string) {
  return useQuery({
    queryKey: KEYS.gapReportsByDate(date),
    queryFn: () => almApi.getGapReportsByDate(date),
    enabled: !!date,
    staleTime: 5 * 60_000,
  });
}

export function useAlmGapReports() {
  return useQuery({
    queryKey: KEYS.gapReports(),
    queryFn: () => almApi.getGapReports(),
    staleTime: 5 * 60_000,
  });
}

export function useAlmPositions(date: string, currency: string) {
  return useQuery({
    queryKey: KEYS.positions(date, currency),
    queryFn: () => almApi.getAlmPositions(date, currency),
    enabled: !!(date && currency),
    staleTime: 5 * 60_000,
  });
}

export function useAlmScenarios() {
  return useQuery({
    queryKey: KEYS.scenarios(),
    queryFn: () => almApi.getScenarios(),
    staleTime: 60_000,
  });
}

export function useRegulatoryScenarios() {
  return useQuery({
    queryKey: KEYS.regulatoryScenarios(),
    queryFn: () => almApi.getRegulatoryScenarios(),
    staleTime: 60_000,
  });
}

export function useGenerateGapReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      reportDate: string;
      currencyCode: string;
      totalRsa: number;
      totalRsl: number;
      buckets?: Array<Record<string, unknown>>;
      avgAssetDuration?: number;
      avgLiabDuration?: number;
    }) => almApi.generateGapReport(payload),
    onSuccess: (_data, { reportDate }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.gapReportsByDate(reportDate) });
      queryClient.invalidateQueries({ queryKey: KEYS.gapReports() });
    },
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      scenarioName: string;
      scenarioType: string;
      shiftBps: Record<string, number>;
      description: string;
      isRegulatory?: boolean;
    }) => almApi.createScenario(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.scenarios() });
    },
  });
}

export function useDurationAnalytics(portfolioCode: string, yieldRate?: number) {
  return useQuery({
    queryKey: [...KEYS.durationAnalytics(portfolioCode), yieldRate ?? 5.0],
    queryFn: () => almApi.getDurationAnalytics(portfolioCode, yieldRate),
    enabled: !!portfolioCode,
    staleTime: 5 * 60_000,
  });
}

// ---- ALCO Pack Hooks ----

export function useAlcoPacks() {
  return useQuery({
    queryKey: KEYS.alcoPacks(),
    queryFn: () => almApi.getAlcoPacks(),
    staleTime: 60_000,
  });
}

export function useAlcoPackByMonth(month: string) {
  return useQuery({
    queryKey: KEYS.alcoPackByMonth(month),
    queryFn: () => almApi.getAlcoPackByMonth(month),
    enabled: !!month,
    staleTime: 60_000,
  });
}

export function useAlcoPackVersions(month: string) {
  return useQuery({
    queryKey: KEYS.alcoPackVersions(month),
    queryFn: () => almApi.getAlcoPackVersions(month),
    enabled: !!month,
  });
}

export function useCreateAlcoPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { month: string; sections: string[]; executiveSummary: string }) =>
      almApi.createAlcoPack(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.alcoPacks() });
    },
  });
}

export function useUpdateAlcoPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; sections: string[]; executiveSummary: string }) =>
      almApi.updateAlcoPack(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.alcoPack(id) });
      qc.invalidateQueries({ queryKey: KEYS.alcoPacks() });
    },
  });
}

export function useSubmitAlcoPackForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => almApi.submitAlcoPackForReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.alcoPacks() });
    },
  });
}

export function useApproveAlcoPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => almApi.approveAlcoPack(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.alcoPacks() });
    },
  });
}

export function useDistributeAlcoPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => almApi.distributeAlcoPack(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.alcoPacks() });
    },
  });
}

export function useGenerateExecutiveSummary() {
  return useMutation({
    mutationFn: (month: string) => almApi.generateExecutiveSummary(month),
  });
}

// ---- Action Items Hooks ----

export function useActionItems() {
  return useQuery({
    queryKey: KEYS.actionItems(),
    queryFn: () => almApi.getActionItems(),
    staleTime: 30_000,
  });
}

export function useCreateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: almApi.createActionItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.actionItems() });
    },
  });
}

export function useUpdateActionItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; status: ActionItemStatus; updateNotes?: string }) =>
      almApi.updateActionItemStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.actionItems() });
    },
  });
}

// ---- Regulatory Returns Hooks ----

export function useRegulatoryReturns() {
  return useQuery({
    queryKey: KEYS.regulatoryReturns(),
    queryFn: () => almApi.getRegulatoryReturns(),
    staleTime: 60_000,
  });
}

export function useRegulatoryReturn(id: number) {
  return useQuery({
    queryKey: KEYS.regulatoryReturn(id),
    queryFn: () => almApi.getRegulatoryReturn(id),
    enabled: !!id,
  });
}

export function useValidateReturn() {
  return useMutation({
    mutationFn: (id: number) => almApi.validateReturn(id),
  });
}

export function useSubmitReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => almApi.submitReturn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.regulatoryReturns() });
      qc.invalidateQueries({ queryKey: KEYS.allSubmissions() });
    },
  });
}

export function useReturnSubmissions(returnId: number) {
  return useQuery({
    queryKey: KEYS.returnSubmissions(returnId),
    queryFn: () => almApi.getReturnSubmissions(returnId),
    enabled: !!returnId,
  });
}

export function useAllSubmissions() {
  return useQuery({
    queryKey: KEYS.allSubmissions(),
    queryFn: () => almApi.getAllSubmissions(),
    staleTime: 60_000,
  });
}

// ── Stress Testing Hooks ────────────────────────────────────────────────────

export function useRunScenario() {
  return useMutation({
    mutationFn: (scenarioId: number) => almApi.runScenario(scenarioId),
  });
}

export function useHistoricalReplay() {
  return useMutation({
    mutationFn: (crisisName: string) => almApi.historicalReplay(crisisName),
  });
}

export function useCompareScenarios() {
  return useMutation({
    mutationFn: (scenarioIds: number[]) => almApi.compareScenarios(scenarioIds),
  });
}
