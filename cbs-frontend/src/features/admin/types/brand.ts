// Auto-generated from backend entities

export interface BrandGuideline {
  id: number;
  guidelineCode: string;
  guidelineName: string;
  guidelineType: string;
  description: string;
  brandTier: string;
  content: Record<string, unknown>;
  assetReferences: string[];
  applicableChannels: string[];
  effectiveFrom: string;
  effectiveTo: string;
  approvalStatus: string;
  approvedBy: string;
}

