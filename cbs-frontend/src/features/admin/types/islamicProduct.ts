export type IslamicProductCategory =
  | 'FINANCING'
  | 'DEPOSIT'
  | 'INVESTMENT'
  | 'INSURANCE'
  | 'TRADE'
  | 'GUARANTEE'
  | 'AGENCY'
  | 'SUKUK';

export type IslamicProductStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'RETIRED';

export type ShariahComplianceStatus =
  | 'DRAFT'
  | 'PENDING_FATWA'
  | 'FATWA_ISSUED'
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'SUSPENDED'
  | 'RETIRED';

export type ProfitCalculationMethod =
  | 'COST_PLUS_MARKUP'
  | 'PROFIT_SHARING_RATIO'
  | 'RENTAL_RATE'
  | 'EXPECTED_PROFIT_RATE'
  | 'COMMISSION_BASED';

export type ProfitRateType = 'FIXED' | 'VARIABLE' | 'TIERED' | 'STEP_UP' | 'STEP_DOWN';
export type ProfitDistributionFrequency =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY'
  | 'AT_MATURITY'
  | 'ON_SALE';
export type ProfitDistributionMethod = 'ACTUAL_PROFIT' | 'INDICATIVE_RATE_SMOOTHED' | 'EXPECTED_PROFIT_RATE';
export type LossSharingMethod = 'PROPORTIONAL_TO_CAPITAL' | 'BANK_ABSORBS_FIRST' | 'CUSTOM';
export type DiminishingFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
export type AssetOwnershipDuringTenor = 'BANK_OWNED' | 'CUSTOMER_OWNED' | 'JOINT';
export type RentalReviewFrequency = 'NONE' | 'ANNUAL' | 'BI_ANNUAL' | 'AS_PER_CONTRACT';
export type MaintenanceResponsibility = 'BANK' | 'CUSTOMER' | 'SHARED';
export type InsuranceResponsibility = 'BANK' | 'CUSTOMER';
export type TakafulModel = 'MUDARABAH' | 'WAKALAH' | 'HYBRID';

export interface IslamicContractType {
  id: number;
  code: string;
  name: string;
  nameAr?: string;
  category: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
  requiredProductFields: string[];
  keyShariahPrinciples: string[];
  keyShariahPrinciplesAr: string[];
  prohibitions: string[];
  prohibitionsAr: string[];
  applicableCategories: string[];
  aaoifiStandard?: string;
}

export interface IslamicProductDraft {
  baseProductId?: number;
  productCode?: string;
  name?: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  contractTypeId?: number;
  contractTypeCode?: string;
  contractTypeName?: string;
  productCategory?: IslamicProductCategory;
  subCategory?: string;
  profitCalculationMethod?: ProfitCalculationMethod;
  profitRateType?: ProfitRateType;
  baseRate?: number;
  baseRateReference?: string;
  margin?: number;
  fixedProfitRate?: number;
  profitRateDecisionTableCode?: string;
  profitDistributionFrequency?: ProfitDistributionFrequency;
  profitDistributionMethod?: ProfitDistributionMethod;
  bankSharePercentage?: number;
  customerSharePercentage?: number;
  profitSharingRatioBank?: number;
  profitSharingRatioCustomer?: number;
  lossSharingMethod?: LossSharingMethod;
  diminishingSchedule?: boolean;
  diminishingFrequency?: DiminishingFrequency;
  diminishingUnitsTotal?: number;
  markupRate?: number;
  costPriceRequired?: boolean;
  sellingPriceImmutable?: boolean;
  gracePeriodDays?: number;
  latePenaltyToCharity?: boolean;
  charityGlAccountCode?: string;
  assetOwnershipDuringTenor?: AssetOwnershipDuringTenor;
  assetTransferOnCompletion?: boolean;
  rentalReviewFrequency?: RentalReviewFrequency;
  maintenanceResponsibility?: MaintenanceResponsibility;
  insuranceResponsibility?: InsuranceResponsibility;
  takafulModel?: TakafulModel;
  wakalahFeePercentage?: number;
  takafulPoolSeparation?: boolean;
  aaoifiStandard?: string;
  ifsbStandard?: string;
  regulatoryProductCode?: string;
  riskWeightPercentage?: number;
  fatwaId?: number;
  fatwaRequired?: boolean;
  shariahRuleGroupCode?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  minAmount?: number;
  maxAmount?: number;
  minTenorMonths?: number;
  maxTenorMonths?: number;
  currencies?: string[];
  eligibleCustomerTypes?: string[];
  eligibleSegments?: string[];
  eligibleCountries?: string[];
  financingAssetGl?: string;
  profitReceivableGl?: string;
  profitIncomeGl?: string;
  depositLiabilityGl?: string;
  profitPayableGl?: string;
  profitExpenseGl?: string;
  charityGl?: string;
  takafulPoolGl?: string;
  suspenseGl?: string;
  baseTemplateCategory?: string;
  changeDescription?: string;
}

export interface IslamicProduct extends IslamicProductDraft {
  id: number;
  contractTypeName?: string;
  contractTypeNameAr?: string;
  activeFatwaId?: number;
  fatwaReference?: string;
  fatwaStatus?: string;
  shariahComplianceStatus: ShariahComplianceStatus;
  status: IslamicProductStatus;
  productVersion: number;
  currentVersionId?: number;
  approvedBy?: string;
  approvedAt?: string;
  hasActiveFatwa: boolean;
  active: boolean;
  activeContractCount: number;
  applicableShariahRules: string[];
  lastShariahReviewDate?: string;
  nextShariahReviewDate?: string;
}

export interface IslamicProductVersion {
  id: number;
  versionNumber: number;
  changeDescription: string;
  changeType: string;
  isMaterialChange: boolean;
  changedFields: string[];
  changedBy: string;
  changedAt: string;
  ssbReviewRequestId?: number;
  ssbReviewStatus: string;
  previousVersionId?: number;
}

export interface ProductFatwaAlert {
  productId: number;
  productCode: string;
  productName: string;
  fatwaId: number;
  fatwaReference: string;
  fatwaExpiryDate: string;
  daysToExpiry: number;
}

export interface FatwaComplianceSummary {
  totalIslamicProducts: number;
  productsWithActiveFatwa: number;
  productsPendingFatwa: number;
  productsWithExpiredFatwa: number;
  productsWithNoFatwa: number;
  productsSuspendedDueToFatwa: number;
  upcomingExpirations: ProductFatwaAlert[];
}