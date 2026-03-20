import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/api';
import { marketDataManagementApi } from '../api/marketDataManagementApi';
import type { AnalysisType, FeedType, Recommendation } from '../api/marketDataManagementApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const keys = {
  feedStatus: ['market-data', 'feeds', 'status'] as const,
  instrumentPrices: (code: string) => ['market-data', 'prices', code] as const,
  marketSignals: (code: string) => ['market-data', 'signals', code] as const,
  publishedResearch: ['market-data', 'research', 'published'] as const,
  switchDashboard: ['market-data-switch', 'dashboard'] as const,
  subscriptionHealth: ['market-data-switch', 'subscriptions', 'health'] as const,
  feedQuality: ['market-data-switch', 'feed-quality'] as const,
  marketAnalysis: (type?: AnalysisType) => ['market-analysis', type ?? 'all'] as const,
  activeResearch: ['market-research', 'active'] as const,
  researchInsights: ['market-research', 'insights'] as const,
};

// ─── Feed & Switch Hooks ──────────────────────────────────────────────────────

export function useFeedStatus() {
  return useQuery({
    queryKey: keys.feedStatus,
    queryFn: () => marketDataManagementApi.getFeedStatus(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useInstrumentPrices(instrumentCode: string) {
  return useQuery({
    queryKey: keys.instrumentPrices(instrumentCode),
    queryFn: () => marketDataManagementApi.getInstrumentPrices(instrumentCode),
    enabled: !!instrumentCode,
    staleTime: 15_000,
  });
}

export function useMarketSignals(instrumentCode: string) {
  return useQuery({
    queryKey: keys.marketSignals(instrumentCode),
    queryFn: () => marketDataManagementApi.getMarketSignals(instrumentCode),
    enabled: !!instrumentCode,
  });
}

export function useRecordPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof marketDataManagementApi.recordPrice>[0]) =>
      marketDataManagementApi.recordPrice(input),
    onSuccess: (_data, { instrumentCode }) => {
      qc.invalidateQueries({ queryKey: keys.instrumentPrices(instrumentCode) });
    },
  });
}

export function useRecordMarketSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { instrumentCode: string; signal: string; confidence: number; source: string; analyst?: string; summary?: string }) =>
      apiPost<import('../api/marketDataManagementApi').MarketSignal>('/api/v1/market-data/signals', input),
    onSuccess: (_data, { instrumentCode }) => {
      qc.invalidateQueries({ queryKey: keys.marketSignals(instrumentCode) });
    },
  });
}

export function usePublishedResearch() {
  return useQuery({
    queryKey: keys.publishedResearch,
    queryFn: () => marketDataManagementApi.getPublishedResearch(),
    staleTime: 5 * 60_000,
  });
}

export function useSwitchDashboard() {
  return useQuery({
    queryKey: keys.switchDashboard,
    queryFn: () => marketDataManagementApi.getSwitchDashboard(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useSubscriptionHealth() {
  return useQuery({
    queryKey: keys.subscriptionHealth,
    queryFn: () => marketDataManagementApi.getSubscriptionHealth(),
    staleTime: 30_000,
  });
}

export function useFeedQualityMetrics() {
  return useQuery({
    queryKey: keys.feedQuality,
    queryFn: () => marketDataManagementApi.getFeedQualityMetrics(),
    staleTime: 60_000,
  });
}

export function useMarketAnalysis(type?: AnalysisType) {
  return useQuery({
    queryKey: keys.marketAnalysis(type),
    queryFn: () =>
      type
        ? marketDataManagementApi.getAnalysisByType(type)
        : marketDataManagementApi.getAnalysisByType('TECHNICAL'),
  });
}

export function useActiveResearchProjects() {
  return useQuery({
    queryKey: keys.activeResearch,
    queryFn: () => marketDataManagementApi.getActiveResearchProjects(),
  });
}

export function useResearchInsights() {
  return useQuery({
    queryKey: keys.researchInsights,
    queryFn: () => marketDataManagementApi.getResearchInsights(),
    staleTime: 5 * 60_000,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useRegisterFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      provider: string;
      assetClass: string;
      feedType: FeedType;
      instruments: string[];
    }) => marketDataManagementApi.registerFeed(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.feedStatus });
      qc.invalidateQueries({ queryKey: keys.feedQuality });
    },
  });
}

export function usePublishResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      instrumentCode: string;
      analyst: string;
      recommendation: Recommendation;
      targetPrice: number;
      summary: string;
      reportUrl?: string;
    }) => marketDataManagementApi.publishResearch(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.publishedResearch });
    },
  });
}

export function useCreateAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      type: AnalysisType;
      instrument?: string;
      sector?: string;
      summary: string;
    }) => marketDataManagementApi.createAnalysis(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.marketAnalysis(variables.type) });
      qc.invalidateQueries({ queryKey: keys.marketAnalysis() });
    },
  });
}

export function usePublishAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => marketDataManagementApi.publishAnalysis(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.marketAnalysis() });
    },
  });
}

export function useCreateResearchProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; type: string; description: string }) =>
      marketDataManagementApi.createResearchProject(input as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.activeResearch });
      qc.invalidateQueries({ queryKey: keys.researchInsights });
    },
  });
}

export function useCompleteResearchProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      findings,
      keyInsights,
      actionItems,
    }: {
      code: string;
      findings: string;
      keyInsights: string[];
      actionItems: string[];
    }) =>
      marketDataManagementApi.completeResearchProject(code, {
        findings,
        keyInsights,
        actionItems,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.activeResearch });
      qc.invalidateQueries({ queryKey: keys.researchInsights });
    },
  });
}
