import { apiGet, apiPost } from '@/lib/api';

// ─── Enums & Status Types ─────────────────────────────────────────────────────

export type FeedStatus = 'ACTIVE' | 'STALE' | 'DOWN';
export type FeedType = 'REALTIME' | 'EOD';
export type SignalType = 'BUY' | 'SELL' | 'HOLD';
export type Recommendation = 'BUY' | 'HOLD' | 'SELL';
export type AnalysisType = 'TECHNICAL' | 'FUNDAMENTAL' | 'SECTOR' | 'MACRO';
export type ResearchProjectType =
  | 'CUSTOMER_SURVEY'
  | 'COMPETITIVE_ANALYSIS'
  | 'PRODUCT_STUDY'
  | 'MARKET_SIZING';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DataFeed {
  feedId: string;
  provider: string;
  assetClass: string;
  feedType: FeedType;
  instruments: string[];
  lastReceivedAt: string;
  latencyMs?: number;
  status: FeedStatus;
  createdAt?: string;
}

export interface FeedQualityMetric {
  feedId: string;
  provider: string;
  assetClass: string;
  completeness: number;
  accuracy: number;
  timeliness: number;
  errorCount: number;
  overallScore: number;
}

export interface MarketPrice {
  instrumentCode: string;
  instrumentName?: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  changePct: number;
  changeAbs?: number;
  currency?: string;
  source?: string;
  recordedAt: string;
}

export interface MarketSignal {
  id: number;
  instrumentCode: string;
  signal: SignalType;
  confidence: number;
  source: string;
  analyst?: string;
  summary?: string;
  generatedAt: string;
}

export interface ResearchReport {
  id: number;
  title: string;
  instrumentCode: string;
  analyst: string;
  recommendation: Recommendation;
  targetPrice: number;
  summary: string;
  reportUrl?: string;
  publishedAt: string;
}

export interface MarketAnalysis {
  id: number;
  code?: string;
  title: string;
  type: AnalysisType;
  instrument?: string;
  sector?: string;
  summary: string;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string;
  createdAt: string;
}

export interface MarketResearchProject {
  id: number;
  code: string;
  title: string;
  type: ResearchProjectType;
  description: string;
  status: 'ACTIVE' | 'COMPLETED';
  findings?: string;
  keyInsights?: string[];
  actionItems?: string[];
  completedAt?: string;
  createdAt: string;
}

export interface SwitchDashboard {
  totalFeeds: number;
  activeFeeds: number;
  messagesPerSec: number;
  errorRate: number;
  uptimePct?: number;
  lastUpdated?: string;
}

export interface SubscriptionHealth {
  subscriptionId: string;
  switchId: string;
  provider: string;
  instrument: string;
  priority: number;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  latencyMs: number;
  lastHeartbeatAt: string;
}

export interface MarketDataSwitch {
  id: string;
  name: string;
  type: string;
  status: 'RUNNING' | 'STOPPED';
  createdAt: string;
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const marketDataManagementApi = {
  // ── Data Feeds ──────────────────────────────────────────────────────────────
  getFeedStatus: () =>
    apiGet<DataFeed[]>('/v1/market-data/feeds/status'),

  registerFeed: (input: {
    provider: string;
    assetClass: string;
    feedType: FeedType;
    instruments: string[];
  }) => apiPost<DataFeed>('/v1/market-data/feeds', input),

  // ── Prices ──────────────────────────────────────────────────────────────────
  getInstrumentPrices: (instrumentCode: string) =>
    apiGet<MarketPrice>(`/v1/market-data/prices/${instrumentCode}`),

  recordPrice: (input: {
    instrumentCode: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    source: string;
  }) => apiPost<MarketPrice>('/v1/market-data/prices', input),

  // ── Signals ─────────────────────────────────────────────────────────────────
  getMarketSignals: (instrumentCode: string) =>
    apiGet<MarketSignal[]>(`/v1/market-data/signals/${instrumentCode}`),

  // ── Research ─────────────────────────────────────────────────────────────────
  publishResearch: (input: {
    title: string;
    instrumentCode: string;
    analyst: string;
    recommendation: Recommendation;
    targetPrice: number;
    summary: string;
    reportUrl?: string;
  }) => apiPost<ResearchReport>('/v1/market-data/research', input),

  getPublishedResearch: () =>
    apiGet<ResearchReport[]>('/v1/market-data/research/published'),

  // ── Switch Dashboard ─────────────────────────────────────────────────────────
  getSwitchDashboard: () =>
    apiGet<SwitchDashboard>('/v1/market-data-switch/dashboard'),

  getSubscriptionHealth: () =>
    apiGet<SubscriptionHealth[]>('/v1/market-data-switch/subscriptions/health'),

  getFeedQualityMetrics: () =>
    apiGet<FeedQualityMetric[]>('/v1/market-data-switch/feed-quality'),

  registerSwitch: (input: { name: string; type: string }) =>
    apiPost<MarketDataSwitch>('/v1/market-data-switch', input),

  startSwitch: (id: string) =>
    apiPost<MarketDataSwitch>(`/v1/market-data-switch/${id}/start`),

  stopSwitch: (id: string) =>
    apiPost<MarketDataSwitch>(`/v1/market-data-switch/${id}/stop`),

  addSubscription: (input: {
    switchId: string;
    provider: string;
    instrument: string;
    priority: number;
  }) => apiPost<SubscriptionHealth>('/v1/market-data-switch/subscriptions', input),

  // ── Market Analysis ──────────────────────────────────────────────────────────
  getAnalysisByType: (type: AnalysisType) =>
    apiGet<MarketAnalysis[]>(`/v1/market-analysis/type/${type}`),

  createAnalysis: (input: {
    title: string;
    type: AnalysisType;
    instrument?: string;
    sector?: string;
    summary: string;
  }) => apiPost<MarketAnalysis>('/v1/market-analysis', input),

  publishAnalysis: (code: string) =>
    apiPost<MarketAnalysis>(`/v1/market-analysis/${code}/publish`),

  // ── Market Research Projects ─────────────────────────────────────────────────
  getActiveResearchProjects: () =>
    apiGet<MarketResearchProject[]>('/v1/market-research/active'),

  getResearchLibrary: (type?: ResearchProjectType) =>
    apiGet<MarketResearchProject[]>('/v1/market-research/library', type ? { type } : undefined),

  getResearchInsights: () =>
    apiGet<{ totalProjects: number; completedThisMonth: number; keyThemes: string[]; recommendations: string[] }>(
      '/v1/market-research/insights'
    ),

  createResearchProject: (input: {
    title: string;
    type: ResearchProjectType;
    description: string;
  }) => apiPost<MarketResearchProject>('/v1/market-research', input),

  completeResearchProject: (code: string, input: {
    findings: string;
    keyInsights: string[];
    actionItems: string[];
  }) => apiPost<MarketResearchProject>(`/v1/market-research/${code}/complete`, input),
};
