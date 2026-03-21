import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Types aligned with Java backend entities ───────────────────────────────

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH';
export type MerchantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

/** Matches MerchantProfile.java entity */
export interface Merchant {
  id: number;
  merchantId: string;
  merchantName: string;
  tradingName?: string;
  merchantCategoryCode: string;
  businessType: string;
  registrationNumber?: string;
  taxId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  settlementAccountId?: number;
  settlementFrequency: string;
  mdrRate: number;
  terminalCount: number;
  monthlyVolumeLimit?: number;
  riskCategory: RiskCategory;
  chargebackRate: number;
  monitoringLevel: string;
  status: MerchantStatus;
  onboardedAt?: string;
  createdAt: string;
  updatedAt?: string;
  // Backward-compat aliases used by existing UI
  businessName?: string;
  mcc?: string;
}

export type FacilityStatus = 'SETUP' | 'ACTIVE' | 'SUSPENDED';

/** Matches AcquiringFacility.java entity */
export interface AcquiringFacility {
  id: number;
  merchantId: number;
  facilityType?: string;
  processorConnection?: string;
  terminalIdPrefix?: string;
  settlementCurrency: string;
  settlementCycle?: string;
  mdrRatePct?: number;
  dailyTransactionLimit?: number;
  monthlyVolumeLimit?: number;
  chargebackLimitPct?: number;
  reserveHoldPct?: number;
  reserveBalance: number;
  pciComplianceStatus: string;
  pciComplianceDate?: string;
  fraudScreeningEnabled: boolean;
  threeDSecureEnabled: boolean;
  status: FacilityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type SettlementStatus = 'CALCULATED' | 'PENDING' | 'SETTLED' | 'FAILED';

/** Matches MerchantSettlement.java entity */
export interface MerchantSettlement {
  id: number;
  merchantId: number;
  facilityId?: number;
  settlementDate?: string;
  grossTransactionAmount: number;
  transactionCount: number;
  mdrDeducted: number;
  otherFeesDeducted: number;
  chargebackDeductions: number;
  refundDeductions: number;
  reserveHeld: number;
  netSettlementAmount: number;
  settlementAccountId?: number;
  settlementReference?: string;
  settledAt?: string;
  status: SettlementStatus;
  createdAt?: string;
}

export type ChargebackStatus = 'RECEIVED' | 'REPRESENTMENT' | 'ARBITRATION' | 'WON' | 'LOST';

/** Matches MerchantChargeback.java entity */
export interface Chargeback {
  id: number;
  merchantId: number;
  originalTransactionRef?: string;
  transactionDate?: string;
  transactionAmount?: number;
  cardNetwork?: string;
  reasonCode?: string;
  reasonDescription?: string;
  chargebackAmount: number;
  currency: string;
  evidenceDeadline?: string;
  merchantResponseRef?: string;
  merchantEvidence?: Record<string, unknown>;
  representmentSubmitted: boolean;
  arbitrationRequired: boolean;
  outcome?: string;
  financialImpact?: number;
  status: ChargebackStatus;
  createdAt?: string;
}

/** PCI compliance — backend returns Map<String, List<AcquiringFacility>> grouped by pciComplianceStatus */
export type PciComplianceReport = Record<string, AcquiringFacility[]>;

// ─── API Functions (aligned with AcquiringController + MerchantController) ──

export const acquiringApi = {
  // Merchants (MerchantController: /v1/merchants)
  getActiveMerchants: () =>
    apiGet<Merchant[]>('/api/v1/merchants/active'),

  getHighRiskMerchants: () =>
    apiGet<Merchant[]>('/api/v1/merchants/high-risk'),

  getAllMerchants: () =>
    apiGet<Merchant[]>('/api/v1/merchants'),

  onboardMerchant: (payload: Partial<Merchant>) =>
    apiPost<Merchant>('/api/v1/merchants', payload),

  activateMerchant: (id: number) =>
    apiPost<Merchant>(`/api/v1/merchants/${id}/activate`),

  suspendMerchant: (id: number, reason: string) =>
    apiPost<Merchant>(`/api/v1/merchants/${id}/suspend`, { reason }),

  // Facilities (AcquiringController: /v1/acquiring/facilities)
  listFacilities: () =>
    apiGet<AcquiringFacility[]>('/api/v1/acquiring/facilities'),

  getMerchantFacilities: (merchantId: number) =>
    apiGet<AcquiringFacility[]>(`/api/v1/acquiring/facilities/merchant/${merchantId}`),

  /** Backend accepts @RequestBody AcquiringFacility entity */
  setupFacility: (payload: Partial<AcquiringFacility>) =>
    apiPost<AcquiringFacility>('/api/v1/acquiring/facilities', payload),

  activateFacility: (id: number) =>
    apiPut<AcquiringFacility>(`/api/v1/acquiring/facilities/${id}/activate`),

  // Settlements (AcquiringController: /v1/acquiring/settlements)
  listSettlements: () =>
    apiGet<MerchantSettlement[]>('/api/v1/acquiring/settlements/process'),

  getMerchantSettlements: (merchantId: number) =>
    apiGet<MerchantSettlement[]>(`/api/v1/acquiring/settlements/merchant/${merchantId}`),

  /** Backend uses @RequestParam merchantId + @RequestParam date, not request body */
  processSettlement: (merchantId: number, date: string) =>
    apiPost<MerchantSettlement>(`/api/v1/acquiring/settlements/process?merchantId=${merchantId}&date=${date}`),

  // Chargebacks (AcquiringController: /v1/acquiring/chargebacks)
  getChargebacks: () =>
    apiGet<Chargeback[]>('/api/v1/acquiring/chargebacks'),

  recordChargeback: (payload: Partial<Chargeback>) =>
    apiPost<Chargeback>('/api/v1/acquiring/chargebacks', payload),

  /** Backend: @RequestParam responseRef + @RequestBody Map<String, Object> evidence */
  submitRepresentment: (id: number, responseRef: string, evidence: Record<string, unknown>) =>
    apiPost<Chargeback>(`/api/v1/acquiring/chargebacks/${id}/representment?responseRef=${encodeURIComponent(responseRef)}`, evidence),

  // PCI Compliance — returns Map<String, List<AcquiringFacility>>
  getPciComplianceReport: () =>
    apiGet<PciComplianceReport>('/api/v1/acquiring/compliance/pci'),
};
