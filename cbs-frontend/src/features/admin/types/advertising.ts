// Auto-generated from backend entities

export interface AdPlacement {
  id: number;
  placementCode: string;
  campaignId: number;
  placementName: string;
  mediaType: string;
  platform: string;
  targetAudience: Record<string, unknown>;
  budgetAmount: number;
  spentAmount: number;
  costModel: string;
  unitCost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctrPct: number;
  conversionRatePct: number;
  costPerAcquisition: number;
  revenueAttributed: number;
  roasPct: number;
  startDate: string;
  endDate: string;
  status: string;
}

