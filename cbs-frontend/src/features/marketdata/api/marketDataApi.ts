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
  instrumentCode: string;
  sector: string;
  region: string;
  summary: string;
  contentRef: string;
  recommendation: string;
  targetPrice: number;
  tags: string[];
  distributionList: string[];
  complianceReviewed: boolean;
  disclaimer: string;
  publishedAt: string;
  status: string;
}

function mapResearchReport(raw: BackendResearchPublication): ResearchReport {
  const rec = raw.recommendation?.toUpperCase();
  return {
    id: raw.id,
    title: raw.title,
    instrumentCode: raw.instrumentCode ?? raw.sector ?? '',
    analyst: raw.author,
    recommendation: (rec === 'BUY' || rec === 'SELL' || rec === 'HOLD' ? rec : 'HOLD') as ResearchReport['recommendation'],
    targetPrice: Number(raw.targetPrice) || 0,
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

export const registerFeed = async (input: {
  provider: string;
  assetClass: string;
  feedType: FeedType;
  instruments: string[];
}): Promise<DataFeed> => {
  // Remap frontend field names to backend entity field names.
  // feedName is required (nullable=false): derive from provider + feedType.
  // dataCategory is the entity field for what the frontend calls assetClass.
  // instrumentsCovered is the entity field for instruments.
  const raw = await apiPost<MarketDataFeed>('/api/v1/market-data/feeds', {
    feedName: `${input.provider} ${input.assetClass} ${input.feedType}`,
    provider: input.provider,
    feedType: input.feedType,
    dataCategory: input.assetClass,
    instrumentsCovered: input.instruments,
  });
  return mapFeed(raw);
};

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

/**
 * Record current bid/ask/last prices for an instrument.
 *
 * The backend stores one row per priceType (BID, ASK, LAST). We post three
 * concurrent requests and return the aggregated frontend MarketPrice.
 */
export const recordPrice = async (input: {
  instrumentCode: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  source: string;
}): Promise<MarketPrice> => {
  const today = new Date().toISOString().split('T')[0];
  const base = { instrumentCode: input.instrumentCode, source: input.source, priceDate: today };
  await Promise.all([
    apiPost('/api/v1/market-data/prices', { ...base, priceType: 'BID',  price: input.bid }),
    apiPost('/api/v1/market-data/prices', { ...base, priceType: 'ASK',  price: input.ask }),
    apiPost('/api/v1/market-data/prices', { ...base, priceType: 'LAST', price: input.last }),
  ]);
  // Return a composed MarketPrice from the inputs for optimistic UI update
  return {
    instrumentCode: input.instrumentCode,
    bid: input.bid,
    ask: input.ask,
    last: input.last,
    volume: input.volume,
    changePct: 0,
    source: input.source,
    recordedAt: new Date().toISOString(),
  };
};

// ─── FX Rates & Money Market ────────────────────────────────────────────────

/**
 * Backend FxRate entity (com.cbs.payments.entity.FxRate).
 * The /fx-rates endpoint returns this type, NOT MarketPriceDto.
 */
interface BackendFxRate {
  id: number;
  sourceCurrency: string;
  targetCurrency: string;
  buyRate: number;
  sellRate: number;
  midRate: number;
  rateDate: string;
  rateSource: string;
  isActive: boolean;
  createdAt: string;
}

/** Map a BackendFxRate row to a frontend MarketPrice for display on FX rate boards. */
function mapFxRateToPrice(raw: BackendFxRate): MarketPrice {
  const code = `${raw.sourceCurrency}/${raw.targetCurrency}`;
  return {
    instrumentCode: code,
    bid: Number(raw.buyRate) || 0,
    ask: Number(raw.sellRate) || 0,
    last: Number(raw.midRate) || 0,
    volume: 0,
    changePct: 0,
    currency: raw.targetCurrency,
    source: raw.rateSource ?? '',
    recordedAt: raw.createdAt ?? raw.rateDate ?? '',
  };
}

/** GET /api/v1/market-data/fx-rates — returns List<FxRate> from payments.entity.FxRate. */
export const getFxRates = async () => {
  const raw = await apiGet<BackendFxRate[]>('/api/v1/market-data/fx-rates');
  return raw.map(mapFxRateToPrice);
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

export const getPublishedResearch = async (): Promise<ResearchReport[]> => {
  const raw = await apiGet<BackendResearchPublication[]>('/api/v1/market-data/research/published');
  return raw.map(mapResearchReport);
};

export const publishResearch = async (input: {
  title: string;
  instrumentCode: string;
  analyst: string;
  recommendation: Recommendation;
  targetPrice: number;
  summary: string;
  reportUrl?: string;
}): Promise<ResearchReport> => {
  // Remap frontend field names to backend entity field names
  const raw = await apiPost<BackendResearchPublication>('/api/v1/market-data/research', {
    title: input.title,
    author: input.analyst,
    instrumentCode: input.instrumentCode,
    recommendation: input.recommendation,
    targetPrice: input.targetPrice,
    summary: input.summary,
    contentRef: input.reportUrl,
  });
  return mapResearchReport(raw);
};

export const getResearchData = async (params?: Record<string, unknown>): Promise<ResearchReport[]> => {
  const raw = await apiGet<BackendResearchPublication[]>('/api/v1/market-data/research', params);
  return raw.map(mapResearchReport);
};

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
