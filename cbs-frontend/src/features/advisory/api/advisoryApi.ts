import { apiGet, apiPost, apiPut, apiPatch } from '@/lib/api';

// ─── Corporate Finance ────────────────────────────────────────────────────────

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

export interface CorporateFinanceRevenueItem {
  period: string;
  revenue: number;
  currency: string;
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

// ─── M&A Advisory ─────────────────────────────────────────────────────────────

export type MaTransactionType =
  | 'ACQUISITION'
  | 'MERGER'
  | 'DIVESTITURE'
  | 'MBO';

export type MaFeeType = 'RETAINER' | 'SUCCESS' | 'ADVISORY';

export interface MaEngagement {
  id: number;
  code: string;
  buyer: string;
  target: string;
  transactionType: MaTransactionType;
  estimatedValue: number;
  currency: string;
  currentMilestone: string;
  stage: string;
  status: string;
  createdAt: string;
}

export interface MaPipelineStage {
  stage: string;
  count: number;
  totalValue: number;
}

export interface MaRevenueItem {
  period: string;
  revenue: number;
}

export interface MaWorkloadItem {
  banker: string;
  activeEngagements: number;
  totalValue: number;
  utilizationPct: number;
}

export interface CreateMaEngagementPayload {
  buyer: string;
  target: string;
  transactionType: MaTransactionType;
  estimatedValue: number;
  currency: string;
}

export interface UpdateMaMilestonePayload {
  milestone: string;
  actualDate: string;
}

export interface RecordMaFeePayload {
  amount: number;
  feeType: MaFeeType;
}

export interface CloseMaEngagementPayload {
  completionDate: string;
  totalValue: number;
  finalFee: number;
}

// ─── Tax Advisory ─────────────────────────────────────────────────────────────

export type TaxServiceType =
  | 'COMPLIANCE'
  | 'PLANNING'
  | 'DISPUTE'
  | 'TRANSFER_PRICING';

export interface TaxEngagement {
  id: number;
  code: string;
  client: string;
  jurisdiction: string;
  serviceType: TaxServiceType;
  estimatedFee: number;
  currency: string;
  status: string;
  createdAt: string;
  taxSaving: number | null;
}

export interface TaxRevenueItem {
  period: string;
  revenue: number;
  serviceType: TaxServiceType;
}

export interface CreateTaxEngagementPayload {
  client: string;
  jurisdiction: string;
  serviceType: TaxServiceType;
  estimatedFee: number;
  currency: string;
}

export interface DeliverOpinionPayload {
  opinionRef: string;
  summary: string;
  taxSaving: number;
}

// ─── Suitability ─────────────────────────────────────────────────────────────

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
  // Corporate Finance
  getCorporateFinanceActive: () =>
    apiGet<CorporateFinanceEngagement[]>('/v1/corporate-finance/active').catch(() => []),
  getCorporateFinancePipeline: () =>
    apiGet<CorporateFinancePipelineItem[]>('/v1/corporate-finance/pipeline').catch(() => []),
  getCorporateFinanceRevenue: (from: string, to: string) =>
    apiGet<CorporateFinanceRevenueItem[]>('/v1/corporate-finance/revenue', { from, to }).catch(() => []),
  getCorporateFinanceCapacity: () =>
    apiGet<CorporateFinanceCapacity[]>('/v1/corporate-finance/capacity').catch(() => []),
  createCorporateFinanceEngagement: (payload: CreateEngagementPayload) =>
    apiPost<CorporateFinanceEngagement>('/v1/corporate-finance', payload),
  deliverDraft: (code: string, payload: DeliverDraftPayload) =>
    apiPost<CorporateFinanceEngagement>(`/v1/corporate-finance/${code}/draft`, payload),
  finalizeDelivery: (code: string) =>
    apiPost<CorporateFinanceEngagement>(`/v1/corporate-finance/${code}/finalize`),
  recordFeeInvoice: (code: string, payload: InvoicePayload) =>
    apiPost<CorporateFinanceEngagement>(`/v1/corporate-finance/${code}/invoice`, payload),
  recordPayment: (code: string, payload: RecordPaymentPayload) =>
    apiPost<CorporateFinanceEngagement>(`/v1/corporate-finance/${code}/payment`, payload),
  closeCorporateFinanceEngagement: (code: string) =>
    apiPost<CorporateFinanceEngagement>(`/v1/corporate-finance/${code}/close`),

  // Project Finance
  getProjectFacilities: (status?: ProjectFinanceStatus) =>
    apiGet<ProjectFacility[]>(`/v1/project-finance/status/${status ?? 'ACTIVE'}`).catch(() => []),
  getFacilityMilestones: (code: string) =>
    apiGet<ProjectMilestone[]>(`/v1/project-finance/${code}/milestones`).catch(() => []),
  createProjectFacility: (payload: CreateProjectFacilityPayload) =>
    apiPost<ProjectFacility>('/v1/project-finance', payload),
  addMilestone: (code: string, payload: AddMilestonePayload) =>
    apiPost<ProjectMilestone>(`/v1/project-finance/${code}/milestones`, payload),
  completeMilestone: (milestoneCode: string, payload: CompleteMilestonePayload) =>
    apiPost<ProjectMilestone>(`/v1/project-finance/milestones/${milestoneCode}/complete`, payload),

  // M&A Advisory
  getMaAdvisoryActive: () =>
    apiGet<MaEngagement[]>('/v1/ma-advisory/active').catch(() => []),
  getMaAdvisoryPipeline: () =>
    apiGet<MaPipelineStage[]>('/v1/ma-advisory/pipeline').catch(() => []),
  getMaAdvisoryRevenue: (from: string, to: string) =>
    apiGet<MaRevenueItem[]>('/v1/ma-advisory/revenue', { from, to }).catch(() => []),
  getMaAdvisoryWorkload: () =>
    apiGet<MaWorkloadItem[]>('/v1/ma-advisory/workload').catch(() => []),
  createMaEngagement: (payload: CreateMaEngagementPayload) =>
    apiPost<MaEngagement>('/v1/ma-advisory', payload),
  updateMaMilestone: (code: string, payload: UpdateMaMilestonePayload) =>
    apiPatch<MaEngagement>(`/v1/ma-advisory/${code}/milestone`, payload),
  recordMaFee: (code: string, payload: RecordMaFeePayload) =>
    apiPost<MaEngagement>(`/v1/ma-advisory/${code}/fee`, payload),
  closeMaEngagement: (code: string, payload: CloseMaEngagementPayload) =>
    apiPost<MaEngagement>(`/v1/ma-advisory/${code}/close`, payload),

  // Tax Advisory
  getTaxAdvisoryActive: () =>
    apiGet<TaxEngagement[]>('/v1/tax-advisory/active').catch(() => []),
  getTaxAdvisoryByJurisdiction: (country: string) =>
    apiGet<TaxEngagement[]>(`/v1/tax-advisory/jurisdiction/${country}`).catch(() => []),
  getTaxAdvisoryRevenue: (from: string, to: string) =>
    apiGet<TaxRevenueItem[]>('/v1/tax-advisory/revenue', { from, to }).catch(() => []),
  createTaxEngagement: (payload: CreateTaxEngagementPayload) =>
    apiPost<TaxEngagement>('/v1/tax-advisory', payload),
  deliverOpinion: (code: string, payload: DeliverOpinionPayload) =>
    apiPost<TaxEngagement>(`/v1/tax-advisory/${code}/opinion`, payload),
  closeTaxEngagement: (code: string) =>
    apiPost<TaxEngagement>(`/v1/tax-advisory/${code}/close`),

  // Suitability
  getSuitabilityProfile: (customerId: number) =>
    apiGet<SuitabilityProfile>(`/v1/suitability/profiles/customer/${customerId}`),
  getExpiredProfiles: () =>
    apiGet<SuitabilityProfile[]>('/v1/suitability/profiles/expired').catch(() => []),
  createSuitabilityProfile: (payload: CreateSuitabilityProfilePayload) =>
    apiPost<SuitabilityProfile>('/v1/suitability/profiles', payload),
  updateSuitabilityProfile: (code: string, payload: UpdateSuitabilityProfilePayload) =>
    apiPut<SuitabilityProfile>(`/v1/suitability/profiles/${code}`, payload),
  performSuitabilityCheck: (payload: PerformSuitabilityCheckPayload) =>
    apiPost<SuitabilityCheck>('/v1/suitability/checks', payload),
  acknowledgeDisclosure: (ref: string, payload: AcknowledgeDisclosurePayload) =>
    apiPost<SuitabilityCheck>(`/v1/suitability/checks/${ref}/acknowledge`, payload),
};
