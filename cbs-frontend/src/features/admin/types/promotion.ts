// Auto-generated from backend entities

export interface PromotionalEvent {
  id: number;
  eventCode: string;
  eventName: string;
  eventType: string;
  description: string;
  targetSegment: string;
  channels: string[];
  offerDetails: Record<string, unknown>;
  termsAndConditions: string;
  promoCode: string;
  discountType: string;
  discountValue: number;
  maxRedemptions: number;
  currentRedemptions: number;
  startDate: string;
  endDate: string;
  registrationUrl: string;
  budgetAmount: number;
  spentAmount: number;
  leadsGenerated: number;
  conversions: number;
  status: string;
}

