import { apiGet } from '@/lib/api';
import { format, subMonths, subDays } from 'date-fns';

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const MOCK_STATS: MarketingStats = {
  activeCampaigns: 6,
  leadsGeneratedMtd: 4820,
  conversionRate: 18.4,
  campaignSpendMtd: 12_450_000,
  roi: 3.2,
  npsScore: 62,
};

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp-001',
    name: 'Q1 Digital Acquisition Drive',
    type: 'ACQUISITION',
    channel: 'Email + Social',
    startDate: '2026-01-05',
    endDate: '2026-03-31',
    targetCount: 50000,
    reachedCount: 43200,
    conversions: 1840,
    cost: 4_200_000,
    revenue: 18_600_000,
    roi: 4.43,
    status: 'ACTIVE',
  },
  {
    id: 'cmp-002',
    name: 'Loan Cross-Sell — Savings Customers',
    type: 'CROSS_SELL',
    channel: 'SMS + Push',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    targetCount: 12000,
    reachedCount: 11840,
    conversions: 924,
    cost: 850_000,
    revenue: 3_240_000,
    roi: 3.81,
    status: 'COMPLETED',
  },
  {
    id: 'cmp-003',
    name: 'Dormant Account Reactivation',
    type: 'REACTIVATION',
    channel: 'Email + Call',
    startDate: '2026-01-15',
    endDate: '2026-03-15',
    targetCount: 8500,
    reachedCount: 6120,
    conversions: 412,
    cost: 1_100_000,
    revenue: 1_640_000,
    roi: 1.49,
    status: 'COMPLETED',
  },
  {
    id: 'cmp-004',
    name: 'Premium Savings Retention',
    type: 'RETENTION',
    channel: 'In-App + Email',
    startDate: '2026-03-01',
    endDate: '2026-04-30',
    targetCount: 22000,
    reachedCount: 18400,
    conversions: 2140,
    cost: 1_800_000,
    revenue: 9_200_000,
    roi: 5.11,
    status: 'ACTIVE',
  },
  {
    id: 'cmp-005',
    name: 'Brand Awareness — TV + Digital',
    type: 'BRAND_AWARENESS',
    channel: 'TV + Social',
    startDate: '2026-02-15',
    endDate: '2026-05-31',
    targetCount: 500000,
    reachedCount: 312000,
    conversions: 680,
    cost: 3_800_000,
    revenue: 2_100_000,
    roi: 0.55,
    status: 'ACTIVE',
  },
  {
    id: 'cmp-006',
    name: 'Youth Savings Acquisition',
    type: 'ACQUISITION',
    channel: 'Social Media',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    targetCount: 30000,
    reachedCount: 0,
    conversions: 0,
    cost: 700_000,
    revenue: 0,
    roi: 0,
    status: 'DRAFT',
  },
];

function buildCampaignDetail(id: string): CampaignDetail {
  const base = MOCK_CAMPAIGNS.find((c) => c.id === id) ?? MOCK_CAMPAIGNS[0];
  const funnelSteps = [
    { stage: 'Sent', count: base.reachedCount, rate: 100 },
    { stage: 'Opened', count: Math.floor(base.reachedCount * 0.42), rate: 42 },
    { stage: 'Clicked', count: Math.floor(base.reachedCount * 0.18), rate: 43 },
    { stage: 'Applied', count: Math.floor(base.reachedCount * 0.07), rate: 39 },
    {
      stage: 'Converted',
      count: base.conversions,
      rate: Math.floor((base.conversions / Math.max(base.reachedCount * 0.07, 1)) * 100),
    },
  ];
  const abTestVariants =
    id === 'cmp-001' || id === 'cmp-002'
      ? [
          { variant: 'A', label: 'Control — Standard Offer', conversionRate: 14.2, winner: false },
          { variant: 'B', label: 'Variant — Personalized Headline', conversionRate: 18.7, winner: true },
        ]
      : undefined;
  const dailyPerformance = Array.from({ length: 20 }, (_, i) => {
    const seed = i + 200 + (id.charCodeAt(4) ?? 0);
    const d = subDays(new Date(), 20 - i);
    return {
      date: format(d, 'dd MMM'),
      conversions: Math.floor(10 + seededRandom(seed) * 60),
      clicks: Math.floor(200 + seededRandom(seed + 50) * 800),
    };
  });
  return { ...base, funnelSteps, abTestVariants, dailyPerformance };
}

function buildSurveyResults(): {
  csatTouchpoints: CsatTouchpoint[];
  npsDistribution: NpsDistributionPoint[];
} {
  const csatTouchpoints: CsatTouchpoint[] = [
    { touchpoint: 'Account Opening', score: 4.3, maxScore: 5, responses: 1240, trend: 0.2 },
    { touchpoint: 'Loan Disbursement', score: 3.8, maxScore: 5, responses: 860, trend: -0.1 },
    { touchpoint: 'Customer Support', score: 4.1, maxScore: 5, responses: 3420, trend: 0.3 },
    { touchpoint: 'Mobile App', score: 3.4, maxScore: 5, responses: 5640, trend: -0.4 },
  ];
  const rawDist: { score: number; count: number }[] = [
    { score: 0, count: 42 }, { score: 1, count: 28 }, { score: 2, count: 61 },
    { score: 3, count: 84 }, { score: 4, count: 120 }, { score: 5, count: 165 },
    { score: 6, count: 198 }, { score: 7, count: 340 }, { score: 8, count: 520 },
    { score: 9, count: 840 }, { score: 10, count: 1240 },
  ];
  const npsDistribution: NpsDistributionPoint[] = rawDist.map(({ score, count }) => ({
    score,
    count,
    category: score <= 6 ? 'DETRACTOR' : score <= 8 ? 'PASSIVE' : 'PROMOTER',
  }));
  return { csatTouchpoints, npsDistribution };
}

function buildNpsTrend(months: number): NpsPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const seed = i + 300;
    const d = subMonths(new Date(), months - 1 - i);
    return {
      month: format(d, 'MMM yy'),
      nps: 52 + Math.floor(seededRandom(seed) * 20) - 4,
      benchmark: 45,
    };
  });
}

const MOCK_LEAD_FUNNEL: LeadFunnelRow[] = [
  { source: 'Organic Search', leads: 1820, qualified: 1092, applications: 640, converted: 412, revenue: 8_240_000, conversionRate: 22.6, costPerAcquisition: 4200 },
  { source: 'Social Media', leads: 1240, qualified: 682, applications: 380, converted: 204, revenue: 4_080_000, conversionRate: 16.5, costPerAcquisition: 6800 },
  { source: 'Referral Program', leads: 960, qualified: 816, applications: 620, converted: 384, revenue: 7_680_000, conversionRate: 40.0, costPerAcquisition: 2100 },
  { source: 'Email Campaigns', leads: 800, qualified: 480, applications: 260, converted: 128, revenue: 2_560_000, conversionRate: 16.0, costPerAcquisition: 9400 },
];

// ─── Demo wrapper ─────────────────────────────────────────────────────────────

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || true;

async function withDemo<T>(mockFn: () => T, apiFn: () => Promise<T>): Promise<T> {
  if (DEMO_MODE) {
    await new Promise<void>((r) => setTimeout(r, 350 + Math.random() * 300));
    return mockFn();
  }
  return apiFn();
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const marketingAnalyticsApi = {
  getStats: (params: DateRangeParams): Promise<MarketingStats> =>
    withDemo(
      () => MOCK_STATS,
      () => apiGet<MarketingStats>('/v1/reports/marketing/stats', params as unknown as Record<string, unknown>),
    ),

  getCampaigns: (params: DateRangeParams): Promise<Campaign[]> =>
    withDemo(
      () => MOCK_CAMPAIGNS,
      () => apiGet<Campaign[]>('/v1/reports/marketing/campaigns', params as unknown as Record<string, unknown>),
    ),

  getCampaignDetail: (id: string): Promise<CampaignDetail> =>
    withDemo(
      () => buildCampaignDetail(id),
      () => apiGet<CampaignDetail>(`/v1/reports/marketing/campaigns/${id}`),
    ),

  getSurveyResults: (params: DateRangeParams): Promise<{ csatTouchpoints: CsatTouchpoint[]; npsDistribution: NpsDistributionPoint[] }> =>
    withDemo(
      () => buildSurveyResults(),
      () =>
        apiGet<{ csatTouchpoints: CsatTouchpoint[]; npsDistribution: NpsDistributionPoint[] }>(
          '/v1/reports/marketing/surveys',
          params as unknown as Record<string, unknown>,
        ),
    ),

  getNpsTrend: (months = 12): Promise<NpsPoint[]> =>
    withDemo(
      () => buildNpsTrend(months),
      () => apiGet<NpsPoint[]>('/v1/reports/marketing/nps-trend', { months }),
    ),

  getLeadFunnel: (params: DateRangeParams): Promise<LeadFunnelRow[]> =>
    withDemo(
      () => MOCK_LEAD_FUNNEL,
      () => apiGet<LeadFunnelRow[]>('/v1/reports/marketing/lead-funnel', params as unknown as Record<string, unknown>),
    ),
};
