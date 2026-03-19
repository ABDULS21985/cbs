// Auto-generated from backend entities

export interface DiscountScheme {
  id: number;
  schemeCode: string;
  schemeName: string;
  schemeType: string;
  discountBasis: string;
  discountValue: number;
  applicableFeeIds: string[];
  applicableProducts: string[];
  applicableSegments: string[];
  minRelationshipValue: number;
  minTransactionVolume: number;
  loyaltyTierRequired: string;
  maxDiscountAmount: number;
  maxUsagePerCustomer: number;
  maxTotalBudget: number;
  currentUtilization: number;
  combinableWithOtherDiscounts: boolean;
  priorityOrder: number;
  effectiveFrom: string;
  effectiveTo: string;
  approvedBy: string;
  approvalDate: string;
  status: string;
}

export interface SpecialPricingAgreement {
  id: number;
  agreementCode: string;
  customerId: number;
  customerName: string;
  agreementType: string;
  negotiatedBy: string;
  approvedBy: string;
  approvalLevel: string;
  feeOverrides: Record<string, unknown>;
  rateOverrides: Record<string, unknown>;
  fxMarginOverride: number;
  freeTransactionAllowance: number;
  waivedFees: string[];
  conditions: string;
  reviewFrequency: string;
  nextReviewDate: string;
  relationshipValueAtApproval: number;
  currentRelationshipValue: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
}

