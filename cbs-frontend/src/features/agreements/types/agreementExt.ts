// ── Customer Agreements ──────────────────────────────────────────────────────

export interface CustomerAgreement {
  id: number;
  agreementNumber: string;
  customerId: number;
  agreementType: string;
  title: string;
  description: string;
  documentRef: string;
  effectiveFrom: string;
  effectiveTo: string;
  autoRenew: boolean;
  renewalTermMonths: number;
  noticePeriodDays: number;
  signedByCustomer: string;
  signedByBank: string;
  signedDate: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';
  terminationReason: string;
  createdAt: string;
  updatedAt?: string;
}

export type CreateCustomerAgreementPayload = Omit<
  CustomerAgreement,
  'id' | 'agreementNumber' | 'status' | 'createdAt' | 'updatedAt' | 'signedByCustomer' | 'signedByBank' | 'signedDate' | 'terminationReason'
>;

// ── TD Framework ─────────────────────────────────────────────────────────────

export interface RateTier {
  minAmount: number;
  maxAmount: number;
  rate: number;
}

export interface TdFrameworkAgreement {
  id: number;
  agreementNumber: string;
  customerId: number;
  agreementType: string;
  currency: string;
  minDepositAmount: number;
  maxDepositAmount: number | null;
  minTenorDays: number;
  maxTenorDays: number;
  rateStructure: 'FIXED' | 'TIERED' | 'NEGOTIATED' | 'BENCHMARK_LINKED';
  baseRate: number | null;
  rateTiers: RateTier[] | null;
  benchmarkReference: string | null;
  spreadOverBenchmark: number | null;
  autoRolloverEnabled: boolean;
  rolloverTenorDays: number | null;
  rolloverRateType: string;
  maturityInstruction: string;
  earlyWithdrawalAllowed: boolean;
  earlyWithdrawalPenaltyPct: number | null;
  partialWithdrawalAllowed: boolean;
  partialWithdrawalMin: number | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
  effectiveFrom: string;
  effectiveTo: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateTdFrameworkPayload = Omit<
  TdFrameworkAgreement,
  'id' | 'agreementNumber' | 'status' | 'approvedBy' | 'createdAt' | 'updatedAt'
>;

export interface TdFrameworkSummary {
  id: number;
  agreementId: number;
  snapshotDate: string;
  activeDeposits: number;
  totalPrincipal: number;
  totalAccruedInterest: number;
  weightedAvgRate: number;
  weightedAvgTenorDays: number;
  maturingNext30Days: number;
  maturingNext60Days: number;
  maturingNext90Days: number;
  expectedRolloverPct: number;
  concentrationPct: number;
}

export interface RateCheckParams {
  amount: number;
  tenorDays: number;
}

export interface RateCheckResult {
  agreement: string;
  amount: number;
  tenor_days: number;
  applicable_rate: number;
}

// ── Commissions ──────────────────────────────────────────────────────────────

export interface CommissionAgreement {
  id: number;
  agreementCode: string;
  agreementName: string;
  agreementType: string;
  partyId: string;
  partyName: string;
  commissionBasis: string;
  baseRatePct: number;
  tierStructure: Array<Record<string, unknown>>;
  applicableProducts: string[];
  minPayout: number;
  maxPayoutMonthly: number;
  maxPayoutAnnual: number;
  clawbackPeriodDays: number;
  clawbackConditions: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
}

export type CreateCommissionAgreementPayload = Omit<
  CommissionAgreement,
  'id' | 'agreementCode' | 'status'
>;

export interface CommissionPayout {
  id: number;
  payoutCode: string;
  agreementId: number;
  partyId: string;
  partyName: string;
  payoutPeriod: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  grossSales: number;
  qualifyingSales: number;
  commissionRateApplied: number;
  grossCommission: number;
  deductions: number;
  clawbackAmount: number;
  taxAmount: number;
  netCommission: number;
  paymentAccountId: number;
  paymentReference: string;
  paidAt: string;
  status: 'CALCULATED' | 'APPROVED' | 'PAID' | 'REVERSED' | 'ON_HOLD';
}

export interface CalculatePayoutParams {
  grossSales: number;
  qualifyingSales: number;
  period: string;
}

// ── Pricing — Discount Schemes ───────────────────────────────────────────────

export interface DiscountScheme {
  id: number;
  schemeCode: string;
  schemeName: string;
  schemeType: string;
  discountBasis: string;
  discountValue: number;
  applicableFeeIds: string[] | null;
  applicableProducts: string[] | null;
  applicableSegments: string[] | null;
  minRelationshipValue: number | null;
  minTransactionVolume: number | null;
  loyaltyTierRequired: string | null;
  maxDiscountAmount: number | null;
  maxUsagePerCustomer: number | null;
  maxTotalBudget: number | null;
  currentUtilization: number;
  combinableWithOtherDiscounts: boolean;
  priorityOrder: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  approvedBy: string | null;
  approvalDate: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'EXHAUSTED';
  createdAt: string;
  updatedAt: string;
}

export type CreateDiscountSchemePayload = Omit<
  DiscountScheme,
  'id' | 'schemeCode' | 'currentUtilization' | 'status' | 'createdAt' | 'updatedAt'
>;

// ── Pricing — Special Pricing ────────────────────────────────────────────────

export interface SpecialPricingAgreement {
  id: number;
  agreementCode: string;
  customerId: number;
  customerName: string;
  agreementType: string;
  negotiatedBy: string | null;
  approvedBy: string | null;
  approvalLevel: string | null;
  feeOverrides: Record<string, unknown> | null;
  rateOverrides: Record<string, unknown> | null;
  fxMarginOverride: number | null;
  freeTransactionAllowance: number | null;
  waivedFees: string[] | null;
  conditions: string | null;
  reviewFrequency: string | null;
  nextReviewDate: string | null;
  relationshipValueAtApproval: number | null;
  currentRelationshipValue: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'UNDER_REVIEW' | 'EXPIRED' | 'TERMINATED';
  createdAt: string;
  updatedAt: string;
}

export type CreateSpecialPricingPayload = Omit<
  SpecialPricingAgreement,
  'id' | 'agreementCode' | 'approvedBy' | 'approvalLevel' | 'currentRelationshipValue' | 'status' | 'createdAt' | 'updatedAt'
>;

// ── Templates ────────────────────────────────────────────────────────────────

export interface AgreementTemplate {
  id: number;
  name: string;
  type: string;
  content: string;
  description?: string;
  isActive?: boolean;
  [key: string]: unknown;
}
