import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';
import type { MaEngagement } from '../types/maAdvisory';

// Re-export so consumers can use the canonical type
export type { MaEngagement };

// ─── M&A Advisory ─────────────────────────────────────────────────────────────
// Real backend entity: com.cbs.maadvisory.entity.MaEngagement
// All field names exactly match Jackson serialization of the JPA entity.

export type MaEngagementType =
  | 'BUY_SIDE'
  | 'SELL_SIDE'
  | 'MERGER'
  | 'DIVESTITURE'
  | 'MBO'
  | 'JOINT_VENTURE'
  | 'SPIN_OFF';

export type MaRole =
  | 'SOLE_ADVISER'
  | 'JOINT_ADVISER'
  | 'BUY_SIDE_ADVISER'
  | 'SELL_SIDE_ADVISER'
  | 'FAIRNESS_OPINION';

export type MaDealStructure = 'CASH' | 'STOCK' | 'MIXED' | 'DEBT_ASSUMPTION' | 'EARNOUT';

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

export type TaxEngagementType =
  | 'TAX_STRUCTURING'
  | 'TRANSFER_PRICING'
  | 'TAX_DUE_DILIGENCE'
  | 'TAX_COMPLIANCE_REVIEW'
  | 'WITHHOLDING_TAX_ADVISORY'
  | 'VAT_ADVISORY'
  | 'TAX_DISPUTE';

export type TaxFeeBasis = 'FIXED' | 'HOURLY' | 'SUCCESS_FEE' | 'RETAINER';
export type TaxRiskRating = 'LOW' | 'MEDIUM' | 'HIGH' | 'AGGRESSIVE';

export interface TaxAdvisoryEngagement {
  id: number;
  engagementCode: string;
  engagementName: string;
  engagementType: TaxEngagementType;
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
// NOTE: Backend entity/controller not yet implemented (only SQL schema V41 exists).
// These types and calls are kept for when the backend is implemented, but will
// return 404 / connection error until then — pages handle this gracefully.

export type CorporateFinanceType =
  | 'M_AND_A'
  | 'IPO'
  | 'RESTRUCTURING'
  | 'BOND_ISSUANCE'
  | 'PRIVATE_EQUITY';

export type CorporateFinanceStage =
  | 'ORIGINATION'
  | 'DUE_DILIGENCE'
  | 'STRUCTURING'
  | 'NEGOTIATION'
  | 'EXECUTION'
  | 'CLOSED';

export interface CorporateFinanceEngagement {
  id: number;
  code: string;
  client: string;
  type: CorporateFinanceType;
  description: string;
  estimatedFee: number;
  currency: string;
  stage: CorporateFinanceStage;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateFinancePipelineItem {
  type: CorporateFinanceType;
  count: number;
  totalEstimatedFee: number;
}

export interface CorporateFinanceCapacity {
  teamMember: string;
  activeEngagements: number;
  capacity: number;
  utilizationPct: number;
}

export interface CreateEngagementPayload {
  client: string;
  type: CorporateFinanceType;
  description: string;
  estimatedFee: number;
  currency: string;
}

export interface DeliverDraftPayload {
  reportRef: string;
  draftUrl: string;
}

export interface InvoicePayload {
  invoiceAmount: number;
  invoiceRef: string;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentRef: string;
}

// ─── Project Finance ──────────────────────────────────────────────────────────
// NOTE: Backend not yet implemented.

export type ProjectFinanceStatus =
  | 'PIPELINE'
  | 'ACTIVE'
  | 'MONITORING'
  | 'COMPLETED'
  | 'DISTRESSED';

export interface ProjectFacility {
  id: number;
  code: string;
  projectName: string;
  sponsor: string;
  sector: string;
  totalCost: number;
  currency: string;
  debtAmount: number;
  equityAmount: number;
  status: ProjectFinanceStatus;
  milestonesCompleted: number;
  milestonesTotal: number;
  createdAt: string;
}

export interface ProjectMilestone {
  id: number;
  code: string;
  facilityCode: string;
  name: string;
  plannedDate: string;
  completionDate: string | null;
  completionCriteria: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
}

export interface CreateProjectFacilityPayload {
  projectName: string;
  sponsor: string;
  sector: string;
  totalCost: number;
  currency: string;
  debtAmount: number;
  equityAmount: number;
}

export interface AddMilestonePayload {
  name: string;
  plannedDate: string;
  completionCriteria: string;
}

export interface CompleteMilestonePayload {
  completionDate: string;
  notes: string;
}

// ─── Suitability ─────────────────────────────────────────────────────────────
// NOTE: Backend not yet implemented.

export type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type SuitabilityResult = 'SUITABLE' | 'UNSUITABLE' | 'OVERRIDE';

export interface SuitabilityProfile {
  id: number;
  code: string;
  customerId: number;
  customerName: string;
  riskTolerance: RiskTolerance;
  investmentHorizon: string;
  liquidityNeeds: string;
  lastReviewDate: string;
  expiryDate: string;
  status: string;
}

export interface SuitabilityCheck {
  ref: string;
  customerId: number;
  customerName: string;
  productCode: string;
  productName: string;
  riskTolerance: RiskTolerance;
  result: SuitabilityResult;
  notes: string;
  checkedAt: string;
}

export interface CreateSuitabilityProfilePayload {
  customerId: number;
  riskTolerance: RiskTolerance;
  investmentHorizon: string;
  liquidityNeeds: string;
}

export interface UpdateSuitabilityProfilePayload {
  riskTolerance: RiskTolerance;
  investmentHorizon: string;
  liquidityNeeds: string;
}

export interface PerformSuitabilityCheckPayload {
  customerId: number;
  productCode: string;
  recommendedAmount: number;
}

export interface AcknowledgeDisclosurePayload {
  customerId: number;
}

// ─── API object ───────────────────────────────────────────────────────────────

export const advisoryApi = {
  // ── M&A Advisory ──────────────────────────────────────────────────────────
  // GET /v1/ma-advisory → List<MaEngagement>
  getAllMaEngagements: () =>
    apiGet<MaEngagement[]>('/api/v1/ma-advisory'),

  // GET /v1/ma-advisory/active → List<MaEngagement> (excludes CLOSED + TERMINATED)
  getMaAdvisoryActive: () =>
    apiGet<MaEngagement[]>('/api/v1/ma-advisory/active'),

  // GET /v1/ma-advisory/pipeline → Map<String,Long> (status → count)
  getMaAdvisoryPipeline: () =>
    apiGet<MaPipeline>('/api/v1/ma-advisory/pipeline'),

  // GET /v1/ma-advisory/revenue?from=&to= → BigDecimal (total fee revenue)
  getMaAdvisoryRevenue: (from: string, to: string) =>
    apiGet<MaRevenue>('/api/v1/ma-advisory/revenue', { from, to }),

  // GET /v1/ma-advisory/workload → Map<String,Long> (leadBanker → active count)
  getMaAdvisoryWorkload: () =>
    apiGet<MaWorkload>('/api/v1/ma-advisory/workload'),

  // POST /v1/ma-advisory @RequestBody MaEngagement → MaEngagement
  createMaEngagement: (payload: CreateMaEngagementPayload) =>
    apiPost<MaEngagement>('/api/v1/ma-advisory', payload),

  // PATCH /v1/ma-advisory/{code}/milestone?field=&date= (query params, not body)
  updateMaMilestone: (code: string, field: string, date: string) => {
    const params = new URLSearchParams({ field, date });
    return api.patch<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/milestone?${params}`)
      .then(r => r.data.data);
  },

  // POST /v1/ma-advisory/{code}/fee?amount= (query param, not body)
  recordMaFee: (code: string, amount: number) => {
    const params = new URLSearchParams({ amount: String(amount) });
    return api.post<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/fee?${params}`)
      .then(r => r.data.data);
  },

  // POST /v1/ma-advisory/{code}/close?actualDealValue= (query param, not body)
  closeMaEngagement: (code: string, actualDealValue: number) => {
    const params = new URLSearchParams({ actualDealValue: String(actualDealValue) });
    return api.post<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/close?${params}`)
      .then(r => r.data.data);
  },

  // POST /v1/ma-advisory/{code}/terminate?reason= (optional query param)
  terminateMaEngagement: (code: string, reason?: string) => {
    const params = reason ? new URLSearchParams({ reason }) : new URLSearchParams();
    const qs = params.toString() ? `?${params}` : '';
    return api.post<{ data: MaEngagement }>(`/api/v1/ma-advisory/${code}/terminate${qs}`)
      .then(r => r.data.data);
  },

  // ── Tax Advisory ──────────────────────────────────────────────────────────
  // GET /v1/tax-advisory → List<TaxAdvisoryEngagement>
  getAllTaxEngagements: () =>
    apiGet<TaxAdvisoryEngagement[]>('/api/v1/tax-advisory'),

  // GET /v1/tax-advisory/active → List<TaxAdvisoryEngagement> (ENGAGED + IN_PROGRESS)
  getTaxAdvisoryActive: () =>
    apiGet<TaxAdvisoryEngagement[]>('/api/v1/tax-advisory/active'),

  // GET /v1/tax-advisory/jurisdiction/{country}
  getTaxAdvisoryByJurisdiction: (country: string) =>
    apiGet<TaxAdvisoryEngagement[]>(`/api/v1/tax-advisory/jurisdiction/${country}`),

  // GET /v1/tax-advisory/revenue?from=&to= → BigDecimal (total advisory fee revenue)
  getTaxAdvisoryRevenue: (from: string, to: string) =>
    apiGet<TaxRevenue>('/api/v1/tax-advisory/revenue', { from, to }),

  // POST /v1/tax-advisory @RequestBody TaxAdvisoryEngagement
  createTaxEngagement: (payload: CreateTaxEngagementPayload) =>
    apiPost<TaxAdvisoryEngagement>('/api/v1/tax-advisory', payload),

  // POST /v1/tax-advisory/{code}/opinion @RequestBody String (raw string, not JSON)
  deliverOpinion: (code: string, opinion: string) =>
    api.post<{ data: TaxAdvisoryEngagement }>(
      `/api/v1/tax-advisory/${code}/opinion`,
      opinion,
      { headers: { 'Content-Type': 'text/plain' } },
    ).then(r => r.data.data),

  // POST /v1/tax-advisory/{code}/close
  closeTaxEngagement: (code: string) =>
    apiPost<TaxAdvisoryEngagement>(`/api/v1/tax-advisory/${code}/close`),

  // ── Corporate Finance (backend not yet implemented) ──────────────────────
  getCorporateFinanceActive: () =>
    apiGet<CorporateFinanceEngagement[]>('/api/v1/corporate-finance/active'),
  getCorporateFinancePipeline: () =>
    apiGet<CorporateFinancePipelineItem[]>('/api/v1/corporate-finance/pipeline'),
  getCorporateFinanceRevenue: (from: string, to: string) =>
    apiGet<number>('/api/v1/corporate-finance/revenue', { from, to }),
  getCorporateFinanceCapacity: () =>
    apiGet<CorporateFinanceCapacity[]>('/api/v1/corporate-finance/capacity'),
  createCorporateFinanceEngagement: (payload: CreateEngagementPayload) =>
    apiPost<CorporateFinanceEngagement>('/api/v1/corporate-finance', payload),
  deliverDraft: (code: string, payload: DeliverDraftPayload) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/draft`, payload),
  finalizeDelivery: (code: string) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/finalize`),
  recordFeeInvoice: (code: string, payload: InvoicePayload) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/invoice`, payload),
  recordPayment: (code: string, payload: RecordPaymentPayload) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/payment`, payload),
  closeCorporateFinanceEngagement: (code: string) =>
    apiPost<CorporateFinanceEngagement>(`/api/v1/corporate-finance/${code}/close`),

  // ── Project Finance (backend not yet implemented) ─────────────────────────
  getProjectFacilities: (status?: ProjectFinanceStatus) =>
    apiGet<ProjectFacility[]>(`/api/v1/project-finance/status/${status ?? 'ACTIVE'}`),
  getFacilityMilestones: (code: string) =>
    apiGet<ProjectMilestone[]>(`/api/v1/project-finance/${code}/milestones`),
  createProjectFacility: (payload: CreateProjectFacilityPayload) =>
    apiPost<ProjectFacility>('/api/v1/project-finance', payload),
  addMilestone: (code: string, payload: AddMilestonePayload) =>
    apiPost<ProjectMilestone>(`/api/v1/project-finance/${code}/milestones`, payload),
  completeMilestone: (milestoneCode: string, payload: CompleteMilestonePayload) =>
    apiPost<ProjectMilestone>(`/api/v1/project-finance/milestones/${milestoneCode}/complete`, payload),

  // ── Suitability (backend not yet implemented) ─────────────────────────────
  getSuitabilityProfile: (customerId: number) =>
    apiGet<SuitabilityProfile>(`/api/v1/suitability/profiles/customer/${customerId}`),
  getExpiredProfiles: () =>
    apiGet<SuitabilityProfile[]>('/api/v1/suitability/profiles/expired'),
  createSuitabilityProfile: (payload: CreateSuitabilityProfilePayload) =>
    apiPost<SuitabilityProfile>('/api/v1/suitability/profiles', payload),
  updateSuitabilityProfile: (code: string, payload: UpdateSuitabilityProfilePayload) =>
    apiPost<SuitabilityProfile>(`/api/v1/suitability/profiles/${code}`, payload),
  performSuitabilityCheck: (payload: PerformSuitabilityCheckPayload) =>
    apiPost<SuitabilityCheck>('/api/v1/suitability/checks', payload),
  acknowledgeDisclosure: (ref: string, payload: AcknowledgeDisclosurePayload) =>
    apiPost<SuitabilityCheck>(`/api/v1/suitability/checks/${ref}/acknowledge`, payload),
};
