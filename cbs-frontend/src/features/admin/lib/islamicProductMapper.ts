import type { BankingProduct, ProductCategory, ProductType } from '../api/productApi';
import type {
  IslamicContractType,
  IslamicProduct,
  IslamicProductCategory,
  IslamicProductDraft,
  ProfitCalculationMethod,
} from '../types/islamicProduct';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function inferIslamicCategory(type?: ProductType): IslamicProductCategory {
  switch (type) {
    case 'LOAN':
      return 'FINANCING';
    case 'FIXED_DEPOSIT':
    case 'INVESTMENT':
      return 'INVESTMENT';
    case 'CURRENT':
    case 'SAVINGS':
    default:
      return 'DEPOSIT';
  }
}

export function inferProfitMethodForContractType(contractCode?: string): ProfitCalculationMethod {
  switch (contractCode) {
    case 'MURABAHA':
      return 'COST_PLUS_MARKUP';
    case 'IJARAH':
      return 'RENTAL_RATE';
    case 'MUDARABAH':
    case 'MUSHARAKAH':
      return 'PROFIT_SHARING_RATIO';
    case 'WAKALAH':
      return 'COMMISSION_BASED';
    default:
      return 'EXPECTED_PROFIT_RATE';
  }
}

function deriveEligibleCustomerTypes(product?: Partial<BankingProduct>): string[] {
  const customerType = product?.eligibility?.customerType;
  if (!customerType || customerType === 'ANY') {
    return ['INDIVIDUAL'];
  }
  if (customerType === 'JOINT') {
    return ['INDIVIDUAL'];
  }
  return [customerType];
}

function deriveEligibleSegments(product?: Partial<BankingProduct>): string[] {
  const segment = product?.eligibility?.segment;
  return !segment || segment === 'ALL' ? [] : [segment];
}

function deriveCurrencies(product?: Partial<BankingProduct>): string[] {
  if (!product?.currency || product.currency === 'MULTI') {
    return ['NGN'];
  }
  return [product.currency];
}

export function isIslamicCategory(category?: ProductCategory): boolean {
  return category === 'ISLAMIC';
}

export function createDefaultIslamicDraft(
  product?: Partial<BankingProduct>,
  existing?: Partial<IslamicProductDraft>,
): IslamicProductDraft {
  const contractCode = existing?.contractTypeCode;
  return {
    nameAr: existing?.nameAr ?? product?.name ?? '',
    descriptionAr: existing?.descriptionAr ?? '',
    contractTypeId: existing?.contractTypeId,
    contractTypeCode: existing?.contractTypeCode,
    contractTypeName: existing?.contractTypeName,
    productCategory: existing?.productCategory ?? inferIslamicCategory(product?.type),
    subCategory: existing?.subCategory ?? '',
    profitCalculationMethod:
      existing?.profitCalculationMethod ?? inferProfitMethodForContractType(contractCode),
    profitRateType: existing?.profitRateType ?? 'FIXED',
    baseRate: existing?.baseRate,
    baseRateReference: existing?.baseRateReference ?? '',
    margin: existing?.margin,
    fixedProfitRate: existing?.fixedProfitRate ?? product?.interestRate,
    profitRateDecisionTableCode: existing?.profitRateDecisionTableCode ?? '',
    profitDistributionFrequency: existing?.profitDistributionFrequency ?? 'MONTHLY',
    profitDistributionMethod: existing?.profitDistributionMethod ?? 'EXPECTED_PROFIT_RATE',
    bankSharePercentage: existing?.bankSharePercentage,
    customerSharePercentage: existing?.customerSharePercentage,
    profitSharingRatioBank: existing?.profitSharingRatioBank,
    profitSharingRatioCustomer: existing?.profitSharingRatioCustomer,
    lossSharingMethod: existing?.lossSharingMethod,
    diminishingSchedule: existing?.diminishingSchedule ?? false,
    diminishingFrequency: existing?.diminishingFrequency,
    diminishingUnitsTotal: existing?.diminishingUnitsTotal,
    markupRate: existing?.markupRate ?? product?.interestRate,
    costPriceRequired: existing?.costPriceRequired ?? true,
    sellingPriceImmutable: existing?.sellingPriceImmutable ?? true,
    gracePeriodDays: existing?.gracePeriodDays ?? 0,
    latePenaltyToCharity: existing?.latePenaltyToCharity ?? true,
    charityGlAccountCode: existing?.charityGlAccountCode ?? '',
    assetOwnershipDuringTenor: existing?.assetOwnershipDuringTenor,
    assetTransferOnCompletion: existing?.assetTransferOnCompletion ?? false,
    rentalReviewFrequency: existing?.rentalReviewFrequency,
    maintenanceResponsibility: existing?.maintenanceResponsibility,
    insuranceResponsibility: existing?.insuranceResponsibility,
    takafulModel: existing?.takafulModel,
    wakalahFeePercentage: existing?.wakalahFeePercentage,
    takafulPoolSeparation: existing?.takafulPoolSeparation ?? true,
    aaoifiStandard: existing?.aaoifiStandard ?? '',
    ifsbStandard: existing?.ifsbStandard ?? '',
    regulatoryProductCode: existing?.regulatoryProductCode ?? '',
    riskWeightPercentage: existing?.riskWeightPercentage,
    fatwaId: existing?.fatwaId,
    fatwaRequired: existing?.fatwaRequired ?? true,
    shariahRuleGroupCode: existing?.shariahRuleGroupCode ?? '',
    effectiveFrom: existing?.effectiveFrom ?? todayIso(),
    effectiveTo: existing?.effectiveTo,
    minAmount:
      existing?.minAmount ??
      product?.eligibility?.minimumOpeningBalance ??
      product?.limits?.minimumBalance ??
      0,
    maxAmount: existing?.maxAmount ?? product?.limits?.maxBalance,
    minTenorMonths: existing?.minTenorMonths ?? 0,
    maxTenorMonths: existing?.maxTenorMonths ?? (product?.type === 'FIXED_DEPOSIT' ? 12 : 0),
    currencies: existing?.currencies ?? deriveCurrencies(product),
    eligibleCustomerTypes: existing?.eligibleCustomerTypes ?? deriveEligibleCustomerTypes(product),
    eligibleSegments: existing?.eligibleSegments ?? deriveEligibleSegments(product),
    eligibleCountries: existing?.eligibleCountries ?? [],
    financingAssetGl: existing?.financingAssetGl ?? '',
    profitReceivableGl: existing?.profitReceivableGl ?? '',
    profitIncomeGl: existing?.profitIncomeGl ?? '',
    depositLiabilityGl: existing?.depositLiabilityGl ?? '',
    profitPayableGl: existing?.profitPayableGl ?? '',
    profitExpenseGl: existing?.profitExpenseGl ?? '',
    charityGl: existing?.charityGl ?? '',
    takafulPoolGl: existing?.takafulPoolGl ?? '',
    suspenseGl: existing?.suspenseGl ?? '',
    baseTemplateCategory: existing?.baseTemplateCategory ?? product?.type,
    changeDescription: existing?.changeDescription ?? '',
  };
}

export function mapIslamicProductToDraft(product: IslamicProduct): IslamicProductDraft {
  return createDefaultIslamicDraft(undefined, {
    ...product,
    contractTypeCode: product.contractTypeCode,
    contractTypeName: product.contractTypeName,
    activeFatwaId: undefined,
    changeDescription: '',
  });
}

export function buildIslamicProductRequest(product: Partial<BankingProduct>): IslamicProductDraft {
  const draft = createDefaultIslamicDraft(product, product.islamicConfig);
  return {
    baseProductId: draft.baseProductId,
    productCode: product.code?.trim() ?? '',
    name: product.name?.trim() ?? '',
    nameAr: draft.nameAr?.trim() || product.name?.trim() || '',
    description: product.longDescription?.trim() || product.shortDescription?.trim() || '',
    descriptionAr: draft.descriptionAr?.trim() || '',
    contractTypeId: draft.contractTypeId,
    productCategory: draft.productCategory,
    subCategory: draft.subCategory?.trim() || '',
    profitCalculationMethod: draft.profitCalculationMethod,
    profitRateType: draft.profitRateType,
    baseRate: draft.baseRate,
    baseRateReference: draft.baseRateReference?.trim() || '',
    margin: draft.margin,
    fixedProfitRate: draft.fixedProfitRate,
    profitRateDecisionTableCode: draft.profitRateDecisionTableCode?.trim() || '',
    profitDistributionFrequency: draft.profitDistributionFrequency,
    profitDistributionMethod: draft.profitDistributionMethod,
    bankSharePercentage: draft.bankSharePercentage,
    customerSharePercentage: draft.customerSharePercentage,
    profitSharingRatioBank: draft.profitSharingRatioBank,
    profitSharingRatioCustomer: draft.profitSharingRatioCustomer,
    lossSharingMethod: draft.lossSharingMethod,
    diminishingSchedule: draft.diminishingSchedule,
    diminishingFrequency: draft.diminishingFrequency,
    diminishingUnitsTotal: draft.diminishingUnitsTotal,
    markupRate: draft.markupRate,
    costPriceRequired: draft.costPriceRequired,
    sellingPriceImmutable: draft.sellingPriceImmutable,
    gracePeriodDays: draft.gracePeriodDays,
    latePenaltyToCharity: draft.latePenaltyToCharity,
    charityGlAccountCode: draft.charityGlAccountCode?.trim() || '',
    assetOwnershipDuringTenor: draft.assetOwnershipDuringTenor,
    assetTransferOnCompletion: draft.assetTransferOnCompletion,
    rentalReviewFrequency: draft.rentalReviewFrequency,
    maintenanceResponsibility: draft.maintenanceResponsibility,
    insuranceResponsibility: draft.insuranceResponsibility,
    takafulModel: draft.takafulModel,
    wakalahFeePercentage: draft.wakalahFeePercentage,
    takafulPoolSeparation: draft.takafulPoolSeparation,
    aaoifiStandard: draft.aaoifiStandard?.trim() || '',
    ifsbStandard: draft.ifsbStandard?.trim() || '',
    regulatoryProductCode: draft.regulatoryProductCode?.trim() || '',
    riskWeightPercentage: draft.riskWeightPercentage,
    fatwaId: draft.fatwaId,
    fatwaRequired: draft.fatwaRequired,
    shariahRuleGroupCode: draft.shariahRuleGroupCode?.trim() || '',
    effectiveFrom: draft.effectiveFrom || todayIso(),
    effectiveTo: draft.effectiveTo,
    minAmount: draft.minAmount,
    maxAmount: draft.maxAmount,
    minTenorMonths: draft.minTenorMonths,
    maxTenorMonths: draft.maxTenorMonths,
    currencies: draft.currencies ?? deriveCurrencies(product),
    eligibleCustomerTypes: draft.eligibleCustomerTypes ?? deriveEligibleCustomerTypes(product),
    eligibleSegments: draft.eligibleSegments ?? deriveEligibleSegments(product),
    eligibleCountries: draft.eligibleCountries ?? [],
    financingAssetGl: draft.financingAssetGl?.trim() || '',
    profitReceivableGl: draft.profitReceivableGl?.trim() || '',
    profitIncomeGl: draft.profitIncomeGl?.trim() || '',
    depositLiabilityGl: draft.depositLiabilityGl?.trim() || '',
    profitPayableGl: draft.profitPayableGl?.trim() || '',
    profitExpenseGl: draft.profitExpenseGl?.trim() || '',
    charityGl: draft.charityGl?.trim() || '',
    takafulPoolGl: draft.takafulPoolGl?.trim() || '',
    suspenseGl: draft.suspenseGl?.trim() || '',
    baseTemplateCategory: product.type,
    changeDescription: draft.changeDescription?.trim() || '',
  };
}

export function sanitizeIslamicDraft(draft: Partial<IslamicProductDraft>): IslamicProductDraft {
  return {
    baseProductId: draft.baseProductId,
    productCode: draft.productCode,
    name: draft.name,
    nameAr: draft.nameAr,
    description: draft.description,
    descriptionAr: draft.descriptionAr,
    contractTypeId: draft.contractTypeId,
    productCategory: draft.productCategory,
    subCategory: draft.subCategory,
    profitCalculationMethod: draft.profitCalculationMethod,
    profitRateType: draft.profitRateType,
    baseRate: draft.baseRate,
    baseRateReference: draft.baseRateReference,
    margin: draft.margin,
    fixedProfitRate: draft.fixedProfitRate,
    profitRateDecisionTableCode: draft.profitRateDecisionTableCode,
    profitDistributionFrequency: draft.profitDistributionFrequency,
    profitDistributionMethod: draft.profitDistributionMethod,
    bankSharePercentage: draft.bankSharePercentage,
    customerSharePercentage: draft.customerSharePercentage,
    profitSharingRatioBank: draft.profitSharingRatioBank,
    profitSharingRatioCustomer: draft.profitSharingRatioCustomer,
    lossSharingMethod: draft.lossSharingMethod,
    diminishingSchedule: draft.diminishingSchedule,
    diminishingFrequency: draft.diminishingFrequency,
    diminishingUnitsTotal: draft.diminishingUnitsTotal,
    markupRate: draft.markupRate,
    costPriceRequired: draft.costPriceRequired,
    sellingPriceImmutable: draft.sellingPriceImmutable,
    gracePeriodDays: draft.gracePeriodDays,
    latePenaltyToCharity: draft.latePenaltyToCharity,
    charityGlAccountCode: draft.charityGlAccountCode,
    assetOwnershipDuringTenor: draft.assetOwnershipDuringTenor,
    assetTransferOnCompletion: draft.assetTransferOnCompletion,
    rentalReviewFrequency: draft.rentalReviewFrequency,
    maintenanceResponsibility: draft.maintenanceResponsibility,
    insuranceResponsibility: draft.insuranceResponsibility,
    takafulModel: draft.takafulModel,
    wakalahFeePercentage: draft.wakalahFeePercentage,
    takafulPoolSeparation: draft.takafulPoolSeparation,
    aaoifiStandard: draft.aaoifiStandard,
    ifsbStandard: draft.ifsbStandard,
    regulatoryProductCode: draft.regulatoryProductCode,
    riskWeightPercentage: draft.riskWeightPercentage,
    fatwaId: draft.fatwaId,
    fatwaRequired: draft.fatwaRequired,
    shariahRuleGroupCode: draft.shariahRuleGroupCode,
    effectiveFrom: draft.effectiveFrom,
    effectiveTo: draft.effectiveTo,
    minAmount: draft.minAmount,
    maxAmount: draft.maxAmount,
    minTenorMonths: draft.minTenorMonths,
    maxTenorMonths: draft.maxTenorMonths,
    currencies: draft.currencies,
    eligibleCustomerTypes: draft.eligibleCustomerTypes,
    eligibleSegments: draft.eligibleSegments,
    eligibleCountries: draft.eligibleCountries,
    financingAssetGl: draft.financingAssetGl,
    profitReceivableGl: draft.profitReceivableGl,
    profitIncomeGl: draft.profitIncomeGl,
    depositLiabilityGl: draft.depositLiabilityGl,
    profitPayableGl: draft.profitPayableGl,
    profitExpenseGl: draft.profitExpenseGl,
    charityGl: draft.charityGl,
    takafulPoolGl: draft.takafulPoolGl,
    suspenseGl: draft.suspenseGl,
    baseTemplateCategory: draft.baseTemplateCategory,
    changeDescription: draft.changeDescription,
  };
}

export function toCommaSeparated(values?: string[]): string {
  return (values ?? []).join(', ');
}

export function fromCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatIslamicProfitDisplay(product?: Partial<IslamicProductDraft>): string {
  if (!product?.profitCalculationMethod) {
    return 'Not configured';
  }
  switch (product.profitCalculationMethod) {
    case 'COST_PLUS_MARKUP':
      return product.markupRate != null ? `Cost + ${product.markupRate}% markup` : 'Cost-plus markup';
    case 'PROFIT_SHARING_RATIO':
      if (product.profitSharingRatioCustomer != null && product.profitSharingRatioBank != null) {
        return `${product.profitSharingRatioCustomer}:${product.profitSharingRatioBank} profit sharing`;
      }
      return 'Profit sharing';
    case 'RENTAL_RATE':
      return product.fixedProfitRate != null ? `${product.fixedProfitRate}% rental rate` : 'Rental rate';
    case 'COMMISSION_BASED':
      return product.wakalahFeePercentage != null
        ? `${product.wakalahFeePercentage}% agency fee`
        : 'Commission based';
    case 'EXPECTED_PROFIT_RATE':
    default:
      return product.fixedProfitRate != null
        ? `${product.fixedProfitRate}% expected profit`
        : 'Expected profit rate';
  }
}

export function enrichIslamicDraftWithContractType(
  draft: IslamicProductDraft,
  contractTypes: IslamicContractType[],
): IslamicProductDraft {
  const contractType = contractTypes.find((item) => item.id === draft.contractTypeId);
  if (!contractType) {
    return draft;
  }
  return {
    ...draft,
    contractTypeCode: contractType.code,
    contractTypeName: contractType.name,
    profitCalculationMethod:
      draft.profitCalculationMethod ?? inferProfitMethodForContractType(contractType.code),
  };
}