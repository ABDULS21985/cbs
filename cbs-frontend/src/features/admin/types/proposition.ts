// Auto-generated from backend entities

export interface CustomerProposition {
  id: number;
  propositionCode: string;
  propositionName: string;
  targetSegment: string;
  valueStatement: string;
  includedProducts: string[];
  pricingSummary: Record<string, unknown>;
  channelAvailability: Record<string, unknown>;
  eligibilityRules: Record<string, unknown>;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
  createdAt: string;
  updatedAt?: string;
}

