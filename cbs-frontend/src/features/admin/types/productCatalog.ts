// Auto-generated from backend entities

export interface ProductCatalogEntry {
  id: number;
  productCode: string;
  productName: string;
  productFamily: string;
  productSubType: string;
  description: string;
  targetSegment: string;
  availableChannels: string[];
  eligibilityCriteria: Record<string, unknown>;
  keyFeatures: Record<string, unknown>[];
  feeSchedule: Record<string, unknown>;
  interestRates: Record<string, unknown>;
  termsAndConditions: string;
  regulatoryClassification: string;
  riskWeightPct: number;
  isShariaCompliant: boolean;
  status: string;
  launchedAt: string;
  retiredAt: string;
}

