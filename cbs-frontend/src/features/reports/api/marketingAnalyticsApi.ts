import { format, startOfMonth, subMonths } from 'date-fns';
import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRangeParams {
  dateFrom: string;
  dateTo: string;
}

export interface MarketingStats {
  totalCampaigns: number;
  totalLeads: number;
  totalConversions: number;
  conversionRate: number;
  npsScore: number;
  averageLeadsPerCampaign: number;
}

export interface Campaign {
  id: string;
  code: string;
  name: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  revenueGenerated: number;
  deliveryRate: number;
  openRate: number;
  clickThroughRate: number;
  conversionRate: number;
}

export interface CampaignDetail extends Campaign {
  funnelSteps: Array<{ stage: string; count: number; rate: number }>;
}

export interface SurveyResult {
  id: string;
  name: string;
  totalSent: number;
  totalResponses: number;
  responseRate: number;
}

export interface NpsPoint {
  month: string;
  nps: number;
}

export interface LeadFunnelRow {
  stage: string;
  count: number;
  conversionRate: number;
}

interface RawMarketingStats {
  totalCampaigns: number;
  totalLeads: number;
  totalConversions: number;
  npsScore: number;
}

interface RawCampaign {
  campaignCode: string;
  campaignName: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  revenueGenerated: number | string;
}

interface RawSurveyResult {
  surveyCode: string;
  surveyName: string;
  totalSent: number;
  totalResponses: number;
  responseRate: number | string;
}

interface RawNpsPoint {
  month: string;
  npsScore: number;
}

interface RawLeadFunnelStage {
  stage: string;
  count: number;
  conversionRate: number | string;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function toPercent(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function mapCampaign(raw: RawCampaign): Campaign {
  const sentCount = raw.sentCount ?? 0;
  const deliveredCount = raw.deliveredCount ?? 0;
  const openedCount = raw.openedCount ?? 0;
  const clickedCount = raw.clickedCount ?? 0;
  const convertedCount = raw.convertedCount ?? 0;
  return {
    id: raw.campaignCode,
    code: raw.campaignCode,
    name: raw.campaignName,
    status: raw.status,
    sentCount,
    deliveredCount,
    openedCount,
    clickedCount,
    convertedCount,
    revenueGenerated: toNumber(raw.revenueGenerated),
    deliveryRate: toPercent(deliveredCount, sentCount),
    openRate: toPercent(openedCount, deliveredCount),
    clickThroughRate: toPercent(clickedCount, deliveredCount),
    conversionRate: toPercent(convertedCount, sentCount),
  };
}

function toDateParams(months = 12): Record<string, string> {
  const to = new Date();
  const from = startOfMonth(subMonths(to, Math.max(months - 1, 0)));
  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd'),
  };
}

export const marketingAnalyticsApi = {
  getStats: async (_params: DateRangeParams): Promise<MarketingStats> => {
    const raw = await apiGet<RawMarketingStats>('/api/v1/reports/marketing/stats');
    return {
      totalCampaigns: raw.totalCampaigns ?? 0,
      totalLeads: raw.totalLeads ?? 0,
      totalConversions: raw.totalConversions ?? 0,
      conversionRate: toPercent(raw.totalConversions ?? 0, raw.totalLeads ?? 0),
      npsScore: raw.npsScore ?? 0,
      averageLeadsPerCampaign: raw.totalCampaigns > 0 ? raw.totalLeads / raw.totalCampaigns : 0,
    };
  },

  getCampaigns: async (_params: DateRangeParams): Promise<Campaign[]> => {
    const raw = await apiGet<RawCampaign[]>('/api/v1/reports/marketing/campaigns');
    return raw.map(mapCampaign);
  },

  getSurveyResults: async (_params: DateRangeParams): Promise<SurveyResult[]> => {
    const raw = await apiGet<RawSurveyResult[]>('/api/v1/reports/marketing/surveys');
    return raw.map((item) => ({
      id: item.surveyCode,
      name: item.surveyName,
      totalSent: item.totalSent ?? 0,
      totalResponses: item.totalResponses ?? 0,
      responseRate: toNumber(item.responseRate),
    }));
  },

  getNpsTrend: async (months?: number): Promise<NpsPoint[]> => {
    const raw = await apiGet<RawNpsPoint[]>('/api/v1/reports/marketing/nps-trend', toDateParams(months));
    return raw.map((point) => ({
      month: point.month,
      nps: point.npsScore ?? 0,
    }));
  },

  getLeadFunnel: async (_params: DateRangeParams): Promise<LeadFunnelRow[]> => {
    const raw = await apiGet<RawLeadFunnelStage[]>('/api/v1/reports/marketing/lead-funnel');
    return raw.map((stage) => ({
      stage: stage.stage,
      count: stage.count ?? 0,
      conversionRate: toNumber(stage.conversionRate),
    }));
  },
};
