/**
 * Consolidated React Query hooks for the market-data feature.
 *
 * Uses a single query-key factory so cache invalidation is predictable.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as dataApi from '../api/marketDataApi';
import * as analysisApi from '../api/marketAnalysisApi';
import * as infraApi from '../api/marketInfraApi';
import type {
  AnalysisType,
  FeedType,
  MarketSignal,
  Recommendation,
  ResearchProjectType,
  FxRate,
} from '../types';
import type { MarketMakingActivity } from '../types/marketMaking';

// ─── Query Key Factory ───────────────────────────────────────────────────────

export const marketDataKeys = {
  all: ['market-data'] as const,
  feeds: () => [...marketDataKeys.all, 'feeds'] as const,
  feedQuality: () => [...marketDataKeys.all, 'feed-quality'] as const,
  prices: () => [...marketDataKeys.all, 'prices'] as const,
  price: (code: string) => [...marketDataKeys.prices(), code] as const,
  signals: (code?: string) => [...marketDataKeys.all, 'signals', code] as const,
  research: ['market-research'] as const,
  publishedResearch: ['market-data', 'research', 'published'] as const,
  researchInsights: ['market-research', 'insights'] as const,
  analysis: (type?: string) => ['market-analysis', type] as const,
  switchDashboard: ['market-switch', 'dashboard'] as const,
  subscriptionHealth: ['market-switch', 'subscriptions', 'health'] as const,
  subscriptions: (params?: Record<string, unknown>) =>
    ['market-data', 'subscriptions', 'list', params] as const,
  marketMaking: ['market-making'] as const,
  activeResearch: ['market-research', 'active'] as const,
};

// ─── Feed & Price Hooks ──────────────────────────────────────────────────────

export function useFeedStatus() {
  return useQuery({
    queryKey: marketDataKeys.feeds(),
    queryFn: () => dataApi.getFeedStatus(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useFeedQualityMetrics() {
  return useQuery({
    queryKey: marketDataKeys.feedQuality(),
    queryFn: () => dataApi.getFeedQualityMetrics(),
    staleTime: 30_000,
  });
}

export function useMarketDataFeeds(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...marketDataKeys.feeds(), 'list', params] as const,
    queryFn: () => dataApi.listFeeds(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarketPrices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...marketDataKeys.prices(), 'list', params] as const,
    queryFn: () => dataApi.listPrices(params),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useInstrumentPrices(instrumentCode: string) {
  return useQuery({
    queryKey: marketDataKeys.price(instrumentCode),
    queryFn: () => dataApi.getInstrumentPrices(instrumentCode),
    enabled: !!instrumentCode,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarketSignals(instrumentCode: string) {
  return useQuery({
    queryKey: marketDataKeys.signals(instrumentCode),
    queryFn: () => dataApi.getMarketSignals(instrumentCode),
    enabled: !!instrumentCode,
    staleTime: 30_000,
  });
}

export function useRecordPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof dataApi.recordPrice>[0]) =>
      dataApi.recordPrice(input),
    onSuccess: (_data, { instrumentCode }) => {
      qc.invalidateQueries({ queryKey: marketDataKeys.price(instrumentCode) });
    },
  });
}

export function useRecordMarketSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MarketSignal>) => dataApi.recordSignal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.signals() });
    },
  });
}

export function useRegisterFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      provider: string;
      assetClass: string;
      feedType: FeedType;
      instruments: string[];
    }) => dataApi.registerFeed(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.feeds() });
      qc.invalidateQueries({ queryKey: marketDataKeys.feedQuality() });
    },
  });
}

// ─── Research Hooks ──────────────────────────────────────────────────────────

export function usePublishedResearch() {
  return useQuery({
    queryKey: marketDataKeys.publishedResearch,
    queryFn: () => dataApi.getPublishedResearch(),
    staleTime: 30_000,
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
    }) => dataApi.publishResearch(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.publishedResearch });
    },
  });
}

export function useMarketResearchData(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...marketDataKeys.research, 'list', params] as const,
    queryFn: () => dataApi.getResearchData(params),
    staleTime: 30_000,
  });
}

// ─── Analysis Hooks ──────────────────────────────────────────────────────────

export function usePublishedAnalysis(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...marketDataKeys.analysis(), 'published', params] as const,
    queryFn: () => analysisApi.getPublished(params),
    staleTime: 30_000,
  });
}

export function useMarketAnalysis(type?: AnalysisType) {
  return useQuery({
    queryKey: marketDataKeys.analysis(type),
    queryFn: () =>
      type
        ? analysisApi.getAnalysisByType(type)
        : analysisApi.getAnalysisByType('TECHNICAL'),
    staleTime: 30_000,
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
    }) => analysisApi.createAnalysis(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: marketDataKeys.analysis(variables.type) });
      qc.invalidateQueries({ queryKey: marketDataKeys.analysis() });
    },
  });
}

export function usePublishAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => analysisApi.publishAnalysis(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.analysis() });
    },
  });
}

// ─── Research Project Hooks ──────────────────────────────────────────────────

export function useActiveResearchProjects() {
  return useQuery({
    queryKey: marketDataKeys.activeResearch,
    queryFn: () => analysisApi.getActiveResearchProjects(),
    staleTime: 30_000,
  });
}

export function useResearchInsights() {
  return useQuery({
    queryKey: marketDataKeys.researchInsights,
    queryFn: () => analysisApi.getResearchInsights(),
    staleTime: 30_000,
  });
}

export function useCreateResearchProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; type: string; description: string }) =>
      analysisApi.createResearchProject(input as { title: string; type: ResearchProjectType; description: string }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.activeResearch });
      qc.invalidateQueries({ queryKey: marketDataKeys.researchInsights });
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
    }) => analysisApi.completeResearchProject(code, { findings, keyInsights, actionItems }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.activeResearch });
      qc.invalidateQueries({ queryKey: marketDataKeys.researchInsights });
    },
  });
}

export function useTrackResearchActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Record<string, unknown> }) =>
      analysisApi.trackResearchActions(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.research });
    },
  });
}

// ─── Switch / Infrastructure Hooks ───────────────────────────────────────────

export function useSwitchDashboard() {
  return useQuery({
    queryKey: marketDataKeys.switchDashboard,
    queryFn: () => infraApi.getSwitchDashboard(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useSubscriptionHealth() {
  return useQuery({
    queryKey: marketDataKeys.subscriptionHealth,
    queryFn: () => infraApi.getSubscriptionHealth(),
    staleTime: 30_000,
  });
}

export function useMarketDataSubscriptions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: marketDataKeys.subscriptions(params),
    queryFn: () => infraApi.listSubscriptions(params),
    staleTime: 30_000,
  });
}

// ─── Market Making Hooks ─────────────────────────────────────────────────────

export function useRecordMarketMakingActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<MarketMakingActivity> }) =>
      infraApi.recordDailyActivity(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.marketMaking });
    },
  });
}

export function useSuspendMarketMakingMandate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => infraApi.suspendMandate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: marketDataKeys.marketMaking });
    },
  });
}

// ─── Switch Management Mutations ─────────────────────────────────────────────

export function useRegisterSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: string }) => infraApi.registerSwitch(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketDataKeys.switchDashboard }); },
  });
}

export function useStartSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => infraApi.startSwitch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketDataKeys.switchDashboard }); },
  });
}

export function useStopSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => infraApi.stopSwitch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketDataKeys.switchDashboard }); },
  });
}

export function useAddSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { switchId: string; provider: string; instrument: string; priority: number }) =>
      infraApi.addSubscription(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketDataKeys.subscriptions }); },
  });
}

export function useMarketMakingMandates() {
  return useQuery({
    queryKey: marketDataKeys.marketMaking,
    queryFn: async () => {
      const { apiGet } = await import('@/lib/api');
      return apiGet<import('../types/marketMaking').MarketMakingMandate[]>('/api/v1/market-making/mandates');
    },
    staleTime: 30_000,
  });
}

// ─── Cross-Feature: FX Rate Hook (Task 4) ────────────────────────────────────

/**
 * Returns the FX rate for a currency pair.
 *
 * Fetches the price for `{baseCcy}/{quoteCcy}` and derives bid, ask, mid, and spread.
 */
export function useFxRate(baseCcy: string, quoteCcy: string) {
  const code = `${baseCcy}/${quoteCcy}`;
  const { data: price, ...rest } = useInstrumentPrices(code);

  const fxRate: FxRate | undefined = price
    ? {
        bid: price.bid,
        ask: price.ask,
        mid: (price.bid + price.ask) / 2,
        spread: price.ask - price.bid,
        updatedAt: price.recordedAt,
      }
    : undefined;

  return { data: fxRate, ...rest };
}
