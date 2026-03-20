import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketDataApi } from '../api/marketDataExtApi';
import { marketDataSwitchApi } from '../api/marketDataSwitchApi';
import { marketAnalysisApi } from '../api/marketAnalysisApi';
import { marketResearchApi } from '../api/marketResearchApi';
import { marketMakingApi } from '../api/marketMakingApi';
import type { MarketSignal } from '../types/marketDataExt';
import type { MarketMakingActivity } from '../types/marketMaking';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  feeds: {
    all: ['market-data', 'feeds'] as const,
    list: (params?: Record<string, unknown>) => ['market-data', 'feeds', 'list', params] as const,
  },
  prices: {
    all: ['market-data', 'prices'] as const,
    list: (params?: Record<string, unknown>) => ['market-data', 'prices', 'list', params] as const,
  },
  signals: {
    all: ['market-data', 'signals'] as const,
  },
  research: {
    all: ['market-data', 'research'] as const,
    list: (params?: Record<string, unknown>) =>
      ['market-data', 'research', 'list', params] as const,
  },
  subscriptions: {
    all: ['market-data', 'subscriptions'] as const,
    list: (params?: Record<string, unknown>) =>
      ['market-data', 'subscriptions', 'list', params] as const,
  },
  analysis: {
    all: ['market-data', 'analysis'] as const,
    published: (params?: Record<string, unknown>) =>
      ['market-data', 'analysis', 'published', params] as const,
  },
  marketMaking: {
    all: ['market-data', 'market-making'] as const,
  },
} as const;

// ─── Market Data Feeds & Prices ──────────────────────────────────────────────

export function useMarketDataFeeds(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.feeds.list(params),
    queryFn: () => marketDataApi.listFeeds(params),
    staleTime: 15_000,
  });
}

export function useMarketPrices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.prices.list(params),
    queryFn: () => marketDataApi.listPrices(params),
    staleTime: 10_000,
  });
}

export function useMarketResearchData(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.research.list(params),
    queryFn: () => marketDataApi.getResearchData(params),
    staleTime: 30_000,
  });
}

export function useRecordMarketSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MarketSignal>) => marketDataApi.recordSignal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.signals.all });
    },
  });
}

// ─── Market Data Switch ──────────────────────────────────────────────────────

export function useMarketDataSubscriptions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.subscriptions.list(params),
    queryFn: () => marketDataSwitchApi.listSubscriptions(params),
    staleTime: 30_000,
  });
}

// ─── Market Analysis ─────────────────────────────────────────────────────────

export function usePublishedAnalysis(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.analysis.published(params),
    queryFn: () => marketAnalysisApi.getPublished(params),
    staleTime: 60_000,
  });
}

// ─── Market Research ─────────────────────────────────────────────────────────

export function useTrackResearchActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Record<string, unknown> }) =>
      marketResearchApi.trackActions(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.research.all });
    },
  });
}

// ─── Market Making ───────────────────────────────────────────────────────────

export function useRecordMarketMakingActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<MarketMakingActivity> }) =>
      marketMakingApi.recordDailyActivity(code, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.marketMaking.all });
    },
  });
}

export function useSuspendMarketMakingMandate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => marketMakingApi.suspendMandate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.marketMaking.all });
    },
  });
}
