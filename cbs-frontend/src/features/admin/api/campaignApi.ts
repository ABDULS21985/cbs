import { apiGet, apiPost } from '@/lib/api';
import type { MarketingCampaign } from '../types/campaign';

export const campaignsApi = {
  /** POST /v1/campaigns — create new campaign */
  createCampaign: (data: Partial<MarketingCampaign>) =>
    apiPost<MarketingCampaign>('/api/v1/campaigns', data),

  /** POST /v1/campaigns/{code}/approve */
  approveCampaign: (code: string, data: Partial<MarketingCampaign>) =>
    apiPost<MarketingCampaign>(`/api/v1/campaigns/${code}/approve`, data),

  /** POST /v1/campaigns/{code}/launch */
  launch: (code: string) =>
    apiPost<MarketingCampaign>(`/api/v1/campaigns/${code}/launch`),

  /** POST /v1/campaigns/{code}/metrics */
  recordMetrics: (code: string) =>
    apiPost<MarketingCampaign>(`/api/v1/campaigns/${code}/metrics`),

  /** GET /v1/campaigns/{code}/performance */
  performance: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/campaigns/${code}/performance`),

  /** GET /v1/campaigns/active */
  getActive: (params?: Record<string, unknown>) =>
    apiGet<MarketingCampaign[]>('/api/v1/campaigns/active', params),

  /** GET /v1/campaigns/active — alias with generic return */
  getActiveSummary: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/campaigns/active', params),

};
