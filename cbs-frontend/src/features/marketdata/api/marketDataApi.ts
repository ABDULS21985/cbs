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
  FxRate,
} from '../types';
import type { MarketDataFeed, MarketPrice as BackendPrice, MarketSignal as BackendSignal } from '../types/marketDataExt';

// ─── Backend → Frontend Mappers ─────────────────────────────────────────────

/** Map backend MarketDataFeed entity → frontend DataFeed interface. */
function mapFeed(raw: MarketDataFeed): DataFeed {
  return {
    feedId: raw.feedCode ?? String(raw.id),
    provider: raw.provider,
    assetClass: raw.dataCategory ?? raw.feedType,
    feedType: (raw.feedType === 'REALTIME' || raw.feedType === 'EOD' ? raw.feedType : 'REALTIME') as FeedType,
    instruments: raw.instrumentsCovered ?? [],
    lastReceivedAt: raw.lastUpdateAt ?? '',
    latencyMs: raw.updateFrequencySec != null ? raw.updateFrequencySec * 1000 : undefined,
    status: (raw.status === 'ACTIVE' || raw.status === 'STALE' || raw.status === 'DOWN'
      ? raw.status
      : raw.isActive ? 'ACTIVE' : 'DOWN') as DataFeed['status'],
    createdAt: undefined,
  };
}

/**
 * Map a list of backend MarketPrice rows (one per priceType) into a single
 * frontend MarketPrice by pivoting on priceType. The backend stores one row
 * per price type (BID, ASK, LAST, etc.) for each instrument.
 */
function aggregatePrices(rows: BackendPrice[]): MarketPrice[] {
  const byInstrument = new Map<string, BackendPrice[]>();
  for (const r of rows) {
    const list = byInstrument.get(r.instrumentCode) ?? [];
    list.push(r);
    byInstrument.set(r.instrumentCode, list);
  }

  const results: MarketPrice[] = [];
  for (const [code, prices] of byInstrument) {
    const bid = prices.find(p => p.priceType === 'BID')?.price ?? 0;
    const ask = prices.find(p => p.priceType === 'ASK')?.price ?? 0;
    const last = prices.find(p => p.priceType === 'LAST')?.price ?? prices[0]?.price ?? 0;
    const latest = prices.reduce((a, b) =>
      (a.priceTime ?? a.createdAt) > (b.priceTime ?? b.createdAt) ? a : b,
    );
    results.push({
      instrumentCode: code,
      bid,
      ask,
      last,
      volume: 0,
      changePct: 0,
      currency: latest.currency,
      source: latest.source,
      recordedAt: latest.priceTime ?? latest.createdAt ?? '',
    });
  }
  return results;
}

/** Map a single backend MarketPrice (or list for one instrument) → frontend MarketPrice. */
function mapSingleInstrumentPrices(rows: BackendPrice | BackendPrice[]): MarketPrice {
  const arr = Array.isArray(rows) ? rows : [rows];
  const aggregated = aggregatePrices(arr);
  return aggregated[0] ?? {
    instrumentCode: arr[0]?.instrumentCode ?? '',
    bid: 0, ask: 0, last: arr[0]?.price ?? 0,
    volume: 0, changePct: 0,
    currency: arr[0]?.currency,
    source: arr[0]?.source,
    recordedAt: arr[0]?.priceTime ?? arr[0]?.createdAt ?? '',
  };
}

/** Map backend MarketSignal entity → frontend MarketSignal interface. */
function mapSignal(raw: BackendSignal): MarketSignal {
  const direction = (raw.signalDirection ?? raw.signalType ?? '').toUpperCase();
  const signal: MarketSignal['signal'] =
    direction === 'BUY' || direction === 'SELL' || direction === 'HOLD'
      ? direction
      : 'HOLD';
  return {
    id: raw.id,
    instrumentCode: raw.instrumentCode,
    signal,
    confidence: raw.confidencePct ?? 0,
    source: raw.signalStrength ?? raw.signalType ?? '',
    analyst: undefined,
    summary: raw.analysisSummary,
    generatedAt: raw.signalDate ?? '',
  };
}

/**
 * Map backend FeedQualityMetric entity → frontend FeedQualityMetric.
 * Backend fields: feedId (number), metricDate, totalRecordsReceived/Processed/Rejected,
 * uptimePct, avgLatencyMs, qualityScore, gapCount, staleDataCount, duplicateCount, outOfRangeCount.
 * Frontend expects: feedId (string), provider, assetClass, completeness, accuracy,
 * timeliness, errorCount, overallScore.
 */
interface BackendFeedQualityMetric {
  id: number;
  feedId: number;
  metricDate: string;
  totalRecordsReceived: number;
  totalRecordsProcessed: number;
  totalRecordsRejected: number;
  uptimePct: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  p99LatencyMs: number;
  gapCount: number;
  staleDataCount: number;
  duplicateCount: number;
  outOfRangeCount: number;
  qualityScore: number;
  createdAt: string;
}

function mapFeedQualityMetric(raw: BackendFeedQualityMetric): FeedQualityMetric {
  const total = raw.totalRecordsReceived || 1;
  return {
    feedId: String(raw.feedId),
    provider: '',
    assetClass: '',
    completeness: total > 0 ? (raw.totalRecordsProcessed / total) * 100 : 0,
    accuracy: total > 0 ? ((total - raw.outOfRangeCount - raw.duplicateCount) / total) * 100 : 0,
    timeliness: raw.uptimePct ?? 0,
    errorCount: raw.totalRecordsRejected + (raw.gapCount ?? 0) + (raw.staleDataCount ?? 0),
    overallScore: raw.qualityScore ?? 0,
  };
}

/** Map backend ResearchPublication entity → frontend ResearchReport. */
interface BackendResearchPublication {
  id: number;
  publicationCode: string;
  title: string;
  publicationType: string;
  author: string;
  sector: string;
  region: string;
  summary: string;
  contentRef: string;
  tags: string[];
  distributionList: string[];
  complianceReviewed: boolean;
  disclaimer: string;
  publishedAt: string;
  status: string;
}

function mapResearchReport(raw: BackendResearchPublication): ResearchReport {
  return {
    id: raw.id,
    title: raw.title,
    instrumentCode: raw.sector ?? '',
    analyst: raw.author,
    recommendation: 'HOLD',
    targetPrice: 0,
    summary: raw.summary,
    reportUrl: raw.contentRef,
    publishedAt: raw.publishedAt ?? '',
  };
}

// ─── Data Feeds ──────────────────────────────────────────────────────────────

export const getFeedStatus = async () => {
  const raw = await apiGet<MarketDataFeed[]>('/api/v1/market-data/feeds/status');
  return raw.map(mapFeed);
};

export const listFeeds = async (params?: Record<string, unknown>) => {
  const raw = await apiGet<MarketDataFeed[]>('/api/v1/market-data/feeds', params);
  return raw.map(mapFeed);
};

export const registerFeed = (input: {
  provider: string;
  assetClass: string;
  feedType: FeedType;
  instruments: string[];
}) => apiPost<DataFeed>('/api/v1/market-data/feeds', input);

export const getFeedQualityMetrics = async () => {
  const raw = await apiGet<BackendFeedQualityMetric[]>('/api/v1/market-data-switch/feed-quality');
  return raw.map(mapFeedQualityMetric);
};

// ─── Prices ──────────────────────────────────────────────────────────────────

export const listPrices = async (params?: Record<string, unknown>) => {
  const raw = await apiGet<BackendPrice[]>('/api/v1/market-data/prices', params);
  return aggregatePrices(raw);
};

export const getInstrumentPrices = async (instrumentCode: string) => {
  const raw = await apiGet<BackendPrice | BackendPrice[]>(`/api/v1/market-data/prices/${instrumentCode}`);
  return mapSingleInstrumentPrices(raw);
};

export const recordPrice = (input: {
  instrumentCode: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  source: string;
}) => apiPost<MarketPrice>('/api/v1/market-data/prices', input);

// ─── FX Rates & Money Market ────────────────────────────────────────────────

/** GET /api/v1/market-data/fx-rates — returns List<MarketPrice> filtered to FX. */
export const getFxRates = async () => {
  const raw = await apiGet<BackendPrice[]>('/api/v1/market-data/fx-rates');
  return aggregatePrices(raw);
};

/** GET /api/v1/market-data/money-market */
export const getMoneyMarketRates = async () => {
  const raw = await apiGet<BackendPrice[]>('/api/v1/market-data/money-market');
  return aggregatePrices(raw);
};

// ─── Signals ─────────────────────────────────────────────────────────────────

export const getMarketSignals = async (instrumentCode: string) => {
  const raw = await apiGet<BackendSignal[]>(`/api/v1/market-data/signals/${instrumentCode}`);
  return raw.map(mapSignal);
};

/** GET /api/v1/market-data/signals — all signals, no instrument filter. */
export const getAllSignals = async () => {
  const raw = await apiGet<BackendSignal[]>('/api/v1/market-data/signals');
  return raw.map(mapSignal);
};

export const recordSignal = (data: Partial<MarketSignal>) =>
  apiPost<MarketSignal>('/api/v1/market-data/signals', data);

// ─── Research Reports ────────────────────────────────────────────────────────

export const getPublishedResearch = async () => {
  const raw = await apiGet<BackendResearchPublication[]>('/api/v1/market-data/research/published');
  return raw.map(mapResearchReport);
};

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

// ─── Feed Operation Logs ────────────────────────────────────────────────────

export interface FeedOperationLog {
  id: number;
  feedId: number;
  operationType: string;
  timestamp: string;
  recordsReceived?: number;
  recordsProcessed?: number;
  recordsRejected?: number;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  recoveryAction?: string;
  connectionDurationSeconds?: number;
  createdAt: string;
}

/** GET /api/v1/market-data/feeds/{feedId}/operations */
export async function getFeedOperationLogs(feedId: string | number): Promise<FeedOperationLog[]> {
  return apiGet<FeedOperationLog[]>(`/api/v1/market-data/feeds/${feedId}/operations`);
}
