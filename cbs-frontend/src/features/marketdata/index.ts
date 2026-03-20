/**
 * Market Data feature barrel export.
 *
 * Other features should import from here rather than reaching into internals.
 */

// ─── Key hooks ───────────────────────────────────────────────────────────────
export {
  marketDataKeys,
  useFeedStatus,
  useFeedQualityMetrics,
  useMarketDataFeeds,
  useMarketPrices,
  useInstrumentPrices,
  useMarketSignals,
  useRecordPrice,
  useRecordMarketSignal,
  useRegisterFeed,
  usePublishedResearch,
  usePublishResearch,
  useMarketAnalysis,
  useCreateAnalysis,
  usePublishAnalysis,
  useActiveResearchProjects,
  useResearchInsights,
  useSwitchDashboard,
  useSubscriptionHealth,
  useFxRate,
} from './hooks/useMarketData';

// ─── Key types ───────────────────────────────────────────────────────────────
export type {
  DataFeed,
  FeedQualityMetric,
  FeedStatus,
  FeedType,
  MarketPrice,
  MarketSignal,
  ResearchReport,
  MarketAnalysis,
  AnalysisType,
  Recommendation,
  SwitchDashboard,
  SubscriptionHealth,
  FxRate,
} from './types';

// ─── Shared components ───────────────────────────────────────────────────────
export { FeedStatusDot } from './components/FeedStatusDot';
export { SignalBadge } from './components/SignalBadge';
export { RecommendationBadge } from './components/RecommendationBadge';
export { PriceCard } from './components/PriceCard';
