import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRangeParams {
  dateFrom: string;
  dateTo: string;
}

export interface MarketingStats {
  activeCampaigns: number;
  leadsGeneratedMtd: number;
  conversionRate: number;
  campaignSpendMtd: number;
  roi: number;
  npsScore: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'ACQUISITION' | 'CROSS_SELL' | 'RETENTION' | 'REACTIVATION' | 'BRAND_AWARENESS';
  channel: string;
  startDate: string;
  endDate: string;
  targetCount: number;
  reachedCount: number;
  conversions: number;
  cost: number;
  revenue: number;
  roi: number;
  status: 'ACTIVE' | 'COMPLETED' | 'DRAFT' | 'PAUSED';
}

export interface CampaignDetail extends Campaign {
  funnelSteps: { stage: string; count: number; rate: number }[];
  abTestVariants?: { variant: string; label: string; conversionRate: number; winner: boolean }[];
  dailyPerformance: { date: string; conversions: number; clicks: number }[];
}

export interface CsatTouchpoint {
  touchpoint: string;
  score: number;
  maxScore: number;
  responses: number;
  trend: number;
}

export interface NpsPoint {
  month: string;
  nps: number;
  benchmark: number;
}

export interface NpsDistributionPoint {
  score: number;
  count: number;
  category: 'DETRACTOR' | 'PASSIVE' | 'PROMOTER';
}

export interface LeadFunnelRow {
  source: string;
  leads: number;
  qualified: number;
  applications: number;
  converted: number;
  revenue: number;
  conversionRate: number;
  costPerAcquisition: number;
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const marketingAnalyticsApi = {
  getStats: (params: DateRangeParams): Promise<MarketingStats> =>
    apiGet<MarketingStats>('/api/v1/reports/marketing/stats', params as unknown as Record<string, unknown>),

  getCampaigns: (params: DateRangeParams): Promise<Campaign[]> =>
    apiGet<Campaign[]>('/api/v1/reports/marketing/campaigns', params as unknown as Record<string, unknown>),

  getCampaignDetail: (id: string): Promise<CampaignDetail> =>
    apiGet<CampaignDetail>(`/api/v1/reports/marketing/campaigns/${id}`),

  getSurveyResults: (params: DateRangeParams): Promise<{ csatTouchpoints: CsatTouchpoint[]; npsDistribution: NpsDistributionPoint[] }> =>
    apiGet<{ csatTouchpoints: CsatTouchpoint[]; npsDistribution: NpsDistributionPoint[] }>(
      '/api/v1/reports/marketing/surveys',
      params as unknown as Record<string, unknown>,
    ),

  getNpsTrend: (months?: number): Promise<NpsPoint[]> =>
    apiGet<NpsPoint[]>('/api/v1/reports/marketing/nps-trend', months ? { months } : undefined),

  getLeadFunnel: (params: DateRangeParams): Promise<LeadFunnelRow[]> =>
    apiGet<LeadFunnelRow[]>('/api/v1/reports/marketing/lead-funnel', params as unknown as Record<string, unknown>),
};
