import { apiPost } from '@/lib/api';
import type { MarketResearchProject } from '../types/marketResearch';

export const marketResearchApi = {
  /** POST /v1/market-research/{code}/actions */
  trackActions: (code: string, data: Record<string, unknown>) =>
    apiPost<MarketResearchProject>(`/api/v1/market-research/${code}/actions`, data),

};
