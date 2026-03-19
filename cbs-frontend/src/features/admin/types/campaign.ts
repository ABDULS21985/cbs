// Auto-generated from backend entities

export interface MarketingCampaign {
  id: number;
  campaignCode: string;
  campaignName: string;
  campaignType: string;
  targetAudience: string;
  channel: string;
  targetSegment: string;
  targetCount: number;
  messageTemplate: string;
  offerDetails: Record<string, unknown>;
  callToAction: string;
  landingUrl: string;
  startDate: string;
  endDate: string;
  sendTime: string;
  budgetAmount: number;
  spentAmount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  unsubscribedCount: number;
  revenueGenerated: number;
  status: string;
  approvedBy: string;
  createdAt: string;
  updatedAt?: string;
}

