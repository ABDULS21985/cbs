/**
 * Consolidated API for feeds, prices, and signals.
 */
import { apiGet, apiPost } from '@/lib/api';
import type {
  DataFeed,
  FeedQualityMetric,
  FeedType,
  MarketPrice,
  MarketSignal,
  ResearchReport,
  Recommendation,
} from '../types';

// ─── Data Feeds ──────────────────────────────────────────────────────────────

export const getFeedStatus = () =>
  apiGet<DataFeed[]>('/api/v1/market-data/feeds/status');

export const listFeeds = (params?: Record<string, unknown>) =>
  apiGet<DataFeed[]>('/api/v1/market-data/feeds', params);

export const registerFeed = (input: {
  provider: string;
  assetClass: string;
  feedType: FeedType;
  instruments: string[];
}) => apiPost<DataFeed>('/api/v1/market-data/feeds', input);

export const getFeedQualityMetrics = () =>
  apiGet<FeedQualityMetric[]>('/api/v1/market-data-switch/feed-quality');

// ─── Prices ──────────────────────────────────────────────────────────────────

export const listPrices = (params?: Record<string, unknown>) =>
  apiGet<MarketPrice[]>('/api/v1/market-data/prices', params);

export const getInstrumentPrices = (instrumentCode: string) =>
  apiGet<MarketPrice>(`/api/v1/market-data/prices/${instrumentCode}`);

export const recordPrice = (input: {
  instrumentCode: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  source: string;
}) => apiPost<MarketPrice>('/api/v1/market-data/prices', input);

// ─── Signals ─────────────────────────────────────────────────────────────────

export const getMarketSignals = (instrumentCode: string) =>
  apiGet<MarketSignal[]>(`/api/v1/market-data/signals/${instrumentCode}`);

export const recordSignal = (data: Partial<MarketSignal>) =>
  apiPost<MarketSignal>('/api/v1/market-data/signals', data);

// ─── Research Reports ────────────────────────────────────────────────────────

export const getPublishedResearch = () =>
  apiGet<ResearchReport[]>('/api/v1/market-data/research/published');

export const publishResearch = (input: {
  title: string;
  instrumentCode: string;
  analyst: string;
  recommendation: Recommendation;
  targetPrice: number;
  summary: string;
  reportUrl?: string;
}) => apiPost<ResearchReport>('/api/v1/market-data/research', input);

export const getResearchData = (params?: Record<string, unknown>) =>
  apiGet<MarketSignal>('/api/v1/market-data/research', params);
