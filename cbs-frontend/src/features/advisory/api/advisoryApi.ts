import { apiGet, apiPost, apiPut } from '@/lib/api';
import api from '@/lib/api';
import type { MaEngagement } from '../types/maAdvisory';

// Re-export so consumers can use the canonical type
export type { MaEngagement };

// ─── M&A Advisory ─────────────────────────────────────────────────────────────
// Real backend entity: com.cbs.maadvisory.entity.MaEngagement
// CHECK constraints from V41 migration

export type MaEngagementType =
  | 'BUY_SIDE'
  | 'SELL_SIDE'
  | 'MERGER'
  | 'DIVESTITURE'
  | 'MANAGEMENT_BUYOUT'
  | 'LEVERAGED_BUYOUT'
  | 'RESTRUCTURING'
  | 'FAIRNESS_OPINION'
  | 'VALUATION_ONLY';

export type MaRole =
  | 'SOLE_ADVISER'
  | 'JOINT_ADVISER'
  | 'BUY_SIDE_ADVISER'
  | 'SELL_SIDE_ADVISER'
  | 'FAIRNESS_OPINION_PROVIDER'
  | 'VALUATION_ADVISER';

export type MaDealStructure = 'CASH' | 'STOCK' | 'MIXED' | 'ASSET_PURCHASE' | 'SHARE_PURCHASE';

export interface CreateMaEngagementPayload {
  engagementName: string;
  engagementType: MaEngagementType;
  clientName: string;
  clientCustomerId?: number;
  clientSector?: string;
  targetName?: string;
  targetSector?: string;
  targetCountry?: string;
  transactionCurrency: string;
  estimatedDealValue?: number;
  dealStructure?: MaDealStructure;
  ourRole: MaRole;
  leadBanker?: string;
  retainerFee?: number;
  retainerFrequency?: 'MONTHLY' | 'QUARTERLY';
  successFeePct?: number;
  successFeeMin?: number;
  successFeeCap?: number;
  expenseReimbursement?: boolean;
}

// Backend returns Map<String, Long>: { status: count }
export type MaPipeline = Record<string, number>;

// Backend returns Map<String, Long>: { bankerName: engagementCount }
export type MaWorkload = Record<string, number>;

// Backend GET /revenue returns a single BigDecimal (total fee revenue in date range)
export type MaRevenue = number;

// ─── Tax Advisory ─────────────────────────────────────────────────────────────
// Real backend entity: com.cbs.taxadvisory.entity.TaxAdvisoryEngagement
// CHECK constraints from V41 migration

export type TaxEngagementType =
  | 'TAX_STRUCTURING'
  | 'TRANSFER_PRICING'
  | 'TAX_DUE_DILIGENCE'
  | 'TAX_COMPLIANCE_REVIEW'
  | 'WITHHOLDING_TAX_ADVISORY'
  | 'DOUBLE_TAX_TREATY'
  | 'TAX_OPINION'
  | 'TAX_DISPUTE'
  | 'VAT_ADVISORY'
  | 'CUSTOM_DUTY'
  | 'EXCISE_TAX'
  | 'INTERNATIONAL_TAX';

export type TaxFeeBasis = 'FIXED' | 'HOURLY' | 'SUCCESS_FEE' | 'RETAINER';
export type TaxRiskRating = 'LOW' | 'MEDIUM' | 'HIGH' | 'AGGRESSIVE';

export interface TaxAdvisoryEngagement {
  id: number;
  engagementCode: string;
  engagementName: string;
  engagementType: string;
  clientName: string;
  clientCustomerId?: number;
  jurisdictions?: Record<string, unknown>;
  taxAuthority?: string;
  leadAdvisor?: string;
  teamMembers?: Record<string, unknown>;
  scopeDescription?: string;
  keyIssues?: Record<string, unknown>;
  taxExposureEstimate?: number;
  taxSavingsIdentified?: number;
  advisoryFee?: number;
  feeBasis?: TaxFeeBasis;
  deliverables?: Record<string, unknown>;
  opinion?: string;
  riskRating?: TaxRiskRating;
  disclaimers?: string;
  engagementStartDate?: string;
  engagementEndDate?: string;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaxEngagementPayload {
  engagementName: string;
  engagementType: TaxEngagementType;
  clientName: string;
  clientCustomerId?: number;
  taxAuthority?: string;
  leadAdvisor?: string;
  scopeDescription?: string;
  advisoryFee?: number;
  feeBasis?: TaxFeeBasis;
  riskRating?: TaxRiskRating;
  engagementStartDate?: string;
}

// Backend GET /revenue returns a single BigDecimal
export type TaxRevenue = number;

// ─── Corporate Finance ────────────────────────────────────────────────────────
// Real backend entity: com.cbs.corpfinance.entity.CorporateFinanceEngagement
// CHECK constraints from V41 migration

export type CorporateFinanceType =
  | 'DEBT_RESTRUCTURING'
  | 'EQUITY_RESTRUCTURING'
  | 'CAPITAL_RAISE_ADVISORY'
  | 'BUSINESS_VALUATION'
  | 'FINANCIAL_MODELLING'
  | 'FEASIBILITY_STUDY'
  | 'STRATEGIC_REVIEW'
  | 'TURNAROUND_ADVISORY'
  | 'REFINANCING'
  | 'RECAPITALIZATION';

export type CorporateFinanceStatus =
  | 'PROPOSAL'
  | 'MANDATED'
  | 'ANALYSIS'
  | 'DRAFT_DELIVERED'
  | 'FINAL_DELIVERED'
  | 'EXECUTION'
  | 'COMPLETED'
  | 'TERMINATED';

export type CorporateFinanceRole =
  | 'SOLE_ADVISER'
  | 'LEAD_ADVISER'
  | 'JOINT_ADVISER'
  | 'INDEPENDENT_ADVISER';

export interface CorporateFinanceEngagement {
  id: number;
  engagementCode: string;
  engagementName: string;
  engagementType: string;
  clientName: string;
  clientCustomerId?: number;
  clientSector?: string;
  currency: string;
  dealValueEstimate?: number;
  ourRole: string;
  leadBanker?: string;
  teamMembers?: Record<string, unknown>;
  scopeOfWork?: string;
  keyAssumptions?: Record<string, unknown>;
  deliverables?: Record<string, unknown>;
  financialModel?: Record<string, unknown>;
  valuationRange?: Record<string, unknown>;
  recommendations?: string;
  retainerFee?: number;
  successFee?: number;
  totalFeesInvoiced: number;
  totalFeesPaid: number;
  mandateDate?: string;
  kickoffDate?: string;
  draftDeliveryDate?: string;
  finalDeliveryDate?: string;
  completionDate?: string;
  linkedDeals?: Record<string, unknown>;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Backend returns Map<String, Long> for pipeline and capacity
export type CorporateFinancePipeline = Record<string, number>;
export type CorporateFinanceCapacity = Record<string, number>;

export interface CreateCFEngagementPayload {
  engagementName: string;
  engagementType: CorporateFinanceType;
  clientName: string;
  clientSector?: string;
  currency?: string;
  dealValueEstimate?: number;
  ourRole: CorporateFinanceRole;
  leadBanker?: string;
  scopeOfWork?: string;
  retainerFee?: number;
  successFee?: number;
}

// ─── Project Finance ──────────────────────────────────────────────────────────
// Real backend entity: com.cbs.projectfinance.entity.ProjectFinanceFacility

export type ProjectFinanceStatus =
  | 'APPRAISAL'
  | 'APPROVED'
  | 'SIGNED'
  | 'DISBURSING'
  | 'CONSTRUCTION'
  | 'OPERATING'
  | 'AMORTIZING'
  | 'MATURED'
  | 'RESTRUCTURED'
  | 'DEFAULTED';

export type ProjectType =
  | 'INFRASTRUCTURE'
  | 'POWER_GENERATION'
  | 'RENEWABLE_ENERGY'
  | 'REAL_ESTATE'
  | 'MINING'
  | 'TELECOM'
  | 'TRANSPORTATION'
  | 'WATER'
  | 'OIL_GAS'
  | 'AGRICULTURE';

export type MilestoneType =
  | 'CONDITION_PRECEDENT'
  | 'DISBURSEMENT_CONDITION'
  | 'CONSTRUCTION'
  | 'COMPLETION_TEST'
  | 'COVENANT_TEST'
  | 'INSURANCE'
  | 'REGULATORY'
  | 'ENVIRONMENTAL';

export interface ProjectFacility {
  id: number;
  facilityCode: string;
  projectName: string;
  projectType: string;
  borrowerName: string;
  spvName?: string;
  country: string;
  currency: string;
  totalProjectCost: number;
  debtAmount: number;
  equityAmount?: number;
  ourShare?: number;
  disbursedAmount: number;
  tenorMonths: number;
  gracePeriodMonths: number;
  baseRate: string;
  marginBps: number;
  creditRating?: string;
  countryRisk?: string;
  environmentalCategory?: string;
  financialCovenants?: Record<string, unknown>;
  securityPackage?: Record<string, unknown>;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectMilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WAIVED' | 'FAILED' | 'OVERDUE';

export interface ProjectMilestone {
  id: number;
  milestoneCode: string;
  facilityId: number;
  milestoneName: string;
  milestoneType: string;
  description?: string;
  dueDate: string;
  completedDate: string | null;
  disbursementLinked: boolean;
  disbursementAmount?: number;
  evidenceRef?: string;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectFacilityPayload {
  projectName: string;
  projectType: ProjectType;
  borrowerName: string;
  spvName?: string;
  country: string;
  currency?: string;
  totalProjectCost: number;
  debtAmount: number;
  equityAmount?: number;
  ourShare?: number;
  tenorMonths: number;
  gracePeriodMonths?: number;
  baseRate?: string;
  marginBps: number;
  creditRating?: string;
  countryRisk?: string;
  environmentalCategory?: string;
}

export interface AddMilestonePayload {
  milestoneName: string;
  milestoneType: MilestoneType;
  description?: string;
  dueDate: string;
  disbursementLinked?: boolean;
  disbursementAmount?: number;
}

// ─── Suitability ─────────────────────────────────────────────────────────────
// Real backend entities: com.cbs.suitability.entity.ClientRiskProfile, SuitabilityCheck

export type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'BALANCED' | 'AGGRESSIVE' | 'VERY_AGGRESSIVE';
export type InvestmentObjective = 'CAPITAL_PRESERVATION' | 'INCOME' | 'BALANCED' | 'GROWTH' | 'AGGRESSIVE_GROWTH' | 'SPECULATION';
export type InvestmentHorizon = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'VERY_LONG_TERM';
export type InvestmentExperience = 'NONE' | 'LIMITED' | 'MODERATE' | 'EXTENSIVE' | 'PROFESSIONAL';
export type SuitabilityResult = 'SUITABLE' | 'UNSUITABLE' | 'SUITABLE_WITH_WARNING';
export type CheckType = 'PRE_TRADE' | 'PERIODIC_REVIEW' | 'PRODUCT_CHANGE' | 'PORTFOLIO_REBALANCE' | 'ADVISORY';
export type InstrumentRiskRating = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'VERY_HIGH_RISK' | 'SPECULATIVE';

export interface SuitabilityProfile {
  id: number;
  profileCode: string;
  customerId: number;
  profileDate: string;
  investmentObjective: string;
  riskTolerance: string;
  investmentHorizon: string;
  annualIncome?: number;
  netWorth?: number;
  liquidNetWorth?: number;
  investmentExperience?: string;
  instrumentExperience?: string;
  knowledgeAssessmentScore?: number;
  concentrationLimits?: string;
  maxSingleInvestmentPct?: number;
  derivativesApproved: boolean;
  leverageApproved: boolean;
  maxLeverageRatio?: number;
  assessedBy?: string;
  nextReviewDate?: string;
  regulatoryBasis?: string;
  status: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SuitabilityCheck {
  id: number;
  checkRef: string;
  customerId: number;
  profileId: number;
  checkType: string;
  instrumentType: string;
  instrumentCode?: string;
  instrumentRiskRating?: string;
  proposedAmount?: number;
  proposedPctOfPortfolio?: number;
  proposedPctOfNetWorth?: number;
  riskToleranceMatch?: boolean;
  experienceMatch?: boolean;
  concentrationCheck?: boolean;
  liquidityCheck?: boolean;
  knowledgeCheck?: boolean;
  leverageCheck?: boolean;
  overallResult: string;
  warningMessages?: string;
  rejectionReasons?: string;
  overrideApplied: boolean;
  overrideJustification?: string;
  overrideApprovedBy?: string;
  regulatoryDisclosure?: string;
  clientAcknowledged: boolean;
  clientAcknowledgedAt?: string;
  checkedAt: string;
  createdBy?: string;
  createdAt?: string;
}

export interface CreateSuitabilityProfilePayload {
  customerId: number;
  investmentObjective: InvestmentObjective;
  riskTolerance: RiskTolerance;
  investmentHorizon: InvestmentHorizon;
  annualIncome?: number;
  netWorth?: number;
  liquidNetWorth?: number;
  investmentExperience?: InvestmentExperience;
  knowledgeAssessmentScore?: number;
  maxSingleInvestmentPct?: number;
  derivativesApproved?: boolean;
  leverageApproved?: boolean;
  nextReviewDate?: string;
  regulatoryBasis?: string;
  assessedBy?: string;
}

export interface UpdateSuitabilityProfilePayload extends Omit<CreateSuitabilityProfilePayload, 'customerId'> {}

export interface PerformSuitabilityCheckPayload {
  profileId: number;
  checkType: CheckType;
  instrumentType: string;
  instrumentCode?: string;
  instrumentRiskRating?: InstrumentRiskRating;
  proposedAmount?: number;
  proposedPctOfPortfolio?: number;
  proposedPctOfNetWorth?: number;
}

// ─── API object ───────────────────────────────────────────────────────────────

export const advisoryApi = {
  // ── M&A Advisory ──────────────────────────────────────────────────────────
  getAllMaEngagements: () =>
    apiGet<MaEngagement[]>('/api/v1/ma-advisory'),

  getMaAdvisoryActive: () =>
    apiGet<MaEngagement[]>('/api/v1/ma-advisory/active'),

  getMaAdvisoryPipeline: () =>
    apiGet<MaPipeline>('/api/v1/ma-advisory/pipeline'),

  getMaAdvisoryRevenue: (from: string, to: string) =>
    apiGet<MaRevenue>('/api/v1/ma-advisory/revenue', { from, to }),

  getMaAdvisoryWorkload: () =>
    apiGet<MaWorkload>('/api/v1/ma-advisory/workload'),

  createMaEngagement: (payload: CreateMaEngagementPayload) =>
    apiPost<MaEngagement>('/api/v1/ma-advisory', payload),

  // PATCH /v1/ma-advisory/{code}/milestone?field=&date= (query params)
  updateMaMilestone: async (code: string, field: string, date: string): Promise<MaEngagement> => {
    const params = new URLSearchParams({ field, date });
    const r = await api.patch<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/milestone?${params}`);
    return r.data.data;
  },

  // POST /v1/ma-advisory/{code}/fee?amount= (query param)
  recordMaFee: async (code: string, amount: number): Promise<MaEngagement> => {
    const params = new URLSearchParams({ amount: String(amount) });
    const r = await api.post<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/fee?${params}`);
    return r.data.data;
  },

  // POST /v1/ma-advisory/{code}/close?actualDealValue= (query param)
  closeMaEngagement: async (code: string, actualDealValue: number): Promise<MaEngagement> => {
    const params = new URLSearchParams({ actualDealValue: String(actualDealValue) });
    const r = await api.post<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/close?${params}`);
    return r.data.data;
  },

  // POST /v1/ma-advisory/{code}/terminate?reason= (optional query param)
  terminateMaEngagement: async (code: string, reason?: string): Promise<MaEngagement> => {
    const params = reason ? new URLSearchParams({ reason }) : new URLSearchParams();
    const qs = params.toString() ? `?${params}` : '';
    const r = await api.post<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/terminate${qs}`);
    return r.data.data;
  },

  // ── Tax Advisory ──────────────────────────────────────────────────────────
  getAllTaxEngagements: () =>
    apiGet<TaxAdvisoryEngagement[]>('/api/v1/tax-advisory'),

  getTaxAdvisoryActive: () =>
    apiGet<TaxAdvisoryEngagement[]>('/api/v1/tax-advisory/active'),

  getTaxAdvisoryByJurisdiction: (country: string) =>
    apiGet<TaxAdvisoryEngagement[]>(`/api/v1/tax-advisory/jurisdiction/${country}`),

  getTaxAdvisoryRevenue: (from: string, to: string) =>
    apiGet<TaxRevenue>('/api/v1/tax-advisory/revenue', { from, to }),

  createTaxEngagement: (payload: CreateTaxEngagementPayload) =>
    apiPost<TaxAdvisoryEngagement>('/api/v1/tax-advisory', payload),

  // POST /v1/tax-advisory/{code}/opinion @RequestBody String (text/plain)
  deliverOpinion: async (code: string, opinion: string): Promise<TaxAdvisoryEngagement> => {
    const r = await api.post<{ data: TaxAdvisoryEngagement }>(
      `/api/v1/tax-advisory/${code}/opinion`,
      opinion,
      { headers: { 'Content-Type': 'text/plain' } },
    );
    return r.data.data;
  },

  closeTaxEngagement: (code: string) =>
    apiPost<TaxAdvisoryEngagement>(`/api/v1/tax-advisory/${code}/close`),

  // ── Corporate Finance ─────────────────────────────────────────────────────
  // Backend: CorporateFinanceController - all endpoints implemented
  getAllCorporateFinanceEngagements: () =>
    apiGet<CorporateFinanceEngagement[]>('/api/v1/corporate-finance'),

  getCorporateFinanceActive: () =>
    apiGet<CorporateFinanceEngagement[]>('/api/v1/corporate-finance/active'),

  getCorporateFinancePipeline: () =>
    apiGet<CorporateFinancePipeline>('/api/v1/corporate-finance/pipeline'),

  getCorporateFinanceRevenue: (from: string, to: string) =>
    apiGet<number>('/api/v1/corporate-finance/revenue', { from, to }),

  getCorporateFinanceCapacity: () =>
    apiGet<CorporateFinanceCapacity>('/api/v1/corporate-finance/capacity'),

  createCorporateFinanceEngagement: (payload: CreateCFEngagementPayload) =>
    apiPost<CorporateFinanceEngagement>('/api/v1/corporate-finance', payload),

  // POST /{code}/draft — no body, backend just sets status + date
  deliverDraft: (code: string) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/draft`),

  finalizeDelivery: (code: string) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/finalize`),

  // POST /{code}/invoice?amount= — query param, not body
  recordFeeInvoice: async (code: string, amount: number): Promise<CorporateFinanceEngagement> => {
    const params = new URLSearchParams({ amount: String(amount) });
    const r = await api.post<{ data: CorporateFinanceEngagement }>(`/api/v1/corporate-finance/${code}/invoice?${params}`);
    return r.data.data;
  },

  // POST /{code}/payment?amount= — query param, not body
  recordPayment: async (code: string, amount: number): Promise<CorporateFinanceEngagement> => {
    const params = new URLSearchParams({ amount: String(amount) });
    const r = await api.post<{ data: CorporateFinanceEngagement }>(`/api/v1/corporate-finance/${code}/payment?${params}`);
    return r.data.data;
  },

  closeCorporateFinanceEngagement: (code: string) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/close`),

  // ── Project Finance ───────────────────────────────────────────────────────
  // Backend: ProjectFinanceController - all endpoints implemented
  getAllProjectFacilities: () =>
    apiGet<ProjectFacility[]>('/api/v1/project-finance'),

  getProjectFacilitiesByStatus: (status: string) =>
    apiGet<ProjectFacility[]>(`/api/v1/project-finance/status/${status}`),

  getFacilityMilestones: (code: string) =>
    apiGet<ProjectMilestone[]>(`/api/v1/project-finance/${code}/milestones`),

  createProjectFacility: (payload: CreateProjectFacilityPayload) =>
    apiPost<ProjectFacility>('/api/v1/project-finance', payload),

  addMilestone: (code: string, payload: AddMilestonePayload) =>
    apiPost<ProjectMilestone>(`/api/v1/project-finance/${code}/milestones`, payload),

  // POST /milestones/{milestoneCode}/complete — no body, backend sets date=now()
  completeMilestone: (milestoneCode: string) =>
    apiPost<ProjectMilestone>(`/api/v1/project-finance/milestones/${milestoneCode}/complete`),

  // ── Suitability ───────────────────────────────────────────────────────────
  // Backend: SuitabilityController - all endpoints implemented
  getAllProfiles: () =>
    apiGet<SuitabilityProfile[]>('/api/v1/suitability/profiles'),

  getSuitabilityProfile: (customerId: number) =>
    apiGet<SuitabilityProfile>(`/api/v1/suitability/profiles/customer/${customerId}`),

  getExpiredProfiles: () =>
    apiGet<SuitabilityProfile[]>('/api/v1/suitability/profiles/expired'),

  createSuitabilityProfile: (payload: CreateSuitabilityProfilePayload) =>
    apiPost<SuitabilityProfile>('/api/v1/suitability/profiles', payload),

  // PUT /profiles/{code} — backend uses PUT, not POST
  updateSuitabilityProfile: (code: string, payload: UpdateSuitabilityProfilePayload) =>
    apiPut<SuitabilityProfile>(`/api/v1/suitability/profiles/${code}`, payload),

  getAllChecks: () =>
    apiGet<SuitabilityCheck[]>('/api/v1/suitability/checks'),

  performSuitabilityCheck: (payload: PerformSuitabilityCheckPayload) =>
    apiPost<SuitabilityCheck>('/api/v1/suitability/checks', payload),

  // POST /checks/{ref}/override?justification=&approver= — query params
  overrideCheck: async (ref: string, justification: string, approver: string): Promise<SuitabilityCheck> => {
    const params = new URLSearchParams({ justification, approver });
    const r = await api.post<{ data: SuitabilityCheck }>(`/api/v1/suitability/checks/${ref}/override?${params}`);
    return r.data.data;
  },

  // POST /checks/{ref}/acknowledge — no body
  acknowledgeDisclosure: (ref: string) =>
    apiPost<SuitabilityCheck>(`/api/v1/suitability/checks/${ref}/acknowledge`),

  getCheckHistory: (customerId: number) =>
    apiGet<SuitabilityCheck[]>(`/api/v1/suitability/checks/customer/${customerId}`),
};
