import { apiGet } from '@/lib/api';
import type { MarketAnalysisReport } from '../types/marketAnalysis';

export const marketAnalysisApi = {
  /** GET /v1/market-analysis/published */
  getPublished: (params?: Record<string, unknown>) =>
    apiGet<MarketAnalysisReport[]>('/api/v1/market-analysis/published', params),

};
