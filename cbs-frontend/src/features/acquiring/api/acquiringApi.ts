import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Types aligned with Java backend entities ───────────────────────────────

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED';
export type MerchantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'UNDER_REVIEW';

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
}

export type FacilityStatus = 'SETUP' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

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

export type SettlementStatus = 'CALCULATED' | 'APPROVED' | 'SETTLED' | 'DISPUTE';

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
  updatedAt?: string;
}

export type ChargebackStatus = 'RECEIVED' | 'NOTIFIED' | 'EVIDENCE_REQUESTED' | 'REPRESENTMENT' | 'ARBITRATION' | 'CLOSED';

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
  updatedAt?: string;
}

/** PCI compliance — backend returns Map<String, List<FacilityResponse>> grouped by pciComplianceStatus */
export type PciComplianceReport = Record<string, AcquiringFacility[]>;

/** Matches RecordChargebackRequest.java DTO */
export interface RecordChargebackPayload {
  merchantId: number;
  originalTransactionRef?: string;
  transactionDate?: string;
  transactionAmount?: number;
  cardNetwork?: string;
  reasonCode?: string;
  reasonDescription?: string;
  chargebackAmount: number;
  currency?: string;
  evidenceDeadline?: string;
}

/** Matches SetupFacilityRequest.java DTO */
export interface SetupFacilityPayload {
  merchantId: number;
  facilityType?: string;
  processorConnection?: string;
  terminalIdPrefix?: string;
  settlementCurrency?: string;
  settlementCycle?: string;
  mdrRatePct?: number;
  dailyTransactionLimit?: number;
  monthlyVolumeLimit?: number;
  chargebackLimitPct?: number;
  reserveHoldPct?: number;
}

/** Matches RegisterTerminalRequest.java DTO */
export interface RegisterTerminalPayload {
  terminalId: string;
  terminalType: string;
  merchantId: string;
  merchantName: string;
  merchantCategoryCode?: string;
  locationAddress?: string;
  supportsContactless?: boolean;
  supportsChip?: boolean;
  supportsMagstripe?: boolean;
  supportsPin?: boolean;
  supportsQr?: boolean;
  maxTransactionAmount?: number;
  acquiringBankCode?: string;
  settlementAccountId?: number;
  batchSettlementTime?: string;
  softwareVersion?: string;
}

/** Matches PosTerminal.java entity */
export interface PosTerminal {
  id: number;
  terminalId: string;
  terminalType: string;
  merchantId: string;
  merchantName: string;
  merchantCategoryCode?: string;
  locationAddress?: string;
  supportsContactless: boolean;
  supportsChip: boolean;
  supportsMagstripe: boolean;
  supportsPin: boolean;
  supportsQr: boolean;
  maxTransactionAmount?: number;
  acquiringBankCode?: string;
  settlementAccountId?: number;
  batchSettlementTime: string;
  lastTransactionAt?: string;
  transactionsToday: number;
  operationalStatus: string;
  lastHeartbeatAt?: string;
  softwareVersion?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── API Functions (aligned with AcquiringController + MerchantController + PosTerminalController) ──

export const acquiringApi = {
  // ── Merchants (MerchantController: /v1/merchants) ──────────────────────────

  getActiveMerchants: () =>
    apiGet<Merchant[]>('/api/v1/merchants/active'),

  getHighRiskMerchants: () =>
    apiGet<Merchant[]>('/api/v1/merchants/high-risk'),

  getAllMerchants: () =>
    apiGet<Merchant[]>('/api/v1/merchants'),

  /** Backend expects MerchantProfile entity fields: merchantName, merchantCategoryCode, businessType, etc. */
  onboardMerchant: (payload: Partial<Merchant>) =>
    apiPost<Merchant>('/api/v1/merchants', payload),

  /** Backend @PathVariable is the merchantId STRING (e.g. "MCH-ABCDEF1234"), NOT the numeric PK */
  activateMerchant: (merchantId: string) =>
    apiPost<Merchant>(`/api/v1/merchants/${encodeURIComponent(merchantId)}/activate`),

  /** Backend uses @PathVariable merchantId STRING + @RequestBody SuspendMerchantRequest */
  suspendMerchant: (merchantId: string, reason: string) =>
    apiPost<Merchant>(`/api/v1/merchants/${encodeURIComponent(merchantId)}/suspend`, { reason }),

  // ── Facilities (AcquiringController: /v1/acquiring/facilities) ─────────────

  listFacilities: () =>
    apiGet<AcquiringFacility[]>('/api/v1/acquiring/facilities'),

  getMerchantFacilities: (merchantId: number) =>
    apiGet<AcquiringFacility[]>(`/api/v1/acquiring/facilities/merchant/${merchantId}`),

  /** Backend accepts @RequestBody SetupFacilityRequest */
  setupFacility: (payload: SetupFacilityPayload) =>
    apiPost<AcquiringFacility>('/api/v1/acquiring/facilities', payload),

  activateFacility: (id: number) =>
    apiPut<AcquiringFacility>(`/api/v1/acquiring/facilities/${id}/activate`),

  // ── Settlements (AcquiringController: /v1/acquiring/settlements) ───────────

  listSettlements: () =>
    apiGet<MerchantSettlement[]>('/api/v1/acquiring/settlements/process'),

  getMerchantSettlements: (merchantId: number) =>
    apiGet<MerchantSettlement[]>(`/api/v1/acquiring/settlements/merchant/${merchantId}`),

  /** Backend uses @RequestParam merchantId (Long) + @RequestParam date (LocalDate ISO) */
  processSettlement: (merchantId: number, date: string) =>
    apiPost<MerchantSettlement>(`/api/v1/acquiring/settlements/process?merchantId=${merchantId}&date=${date}`),

  // ── Chargebacks (AcquiringController: /v1/acquiring/chargebacks) ───────────

  getChargebacks: () =>
    apiGet<Chargeback[]>('/api/v1/acquiring/chargebacks'),

  recordChargeback: (payload: RecordChargebackPayload) =>
    apiPost<Chargeback>('/api/v1/acquiring/chargebacks', payload),

  /** Backend: @PathVariable id + @RequestBody SubmitRepresentmentRequest { responseRef, evidence } */
  submitRepresentment: (id: number, responseRef: string, evidence: Record<string, unknown>) =>
    apiPost<Chargeback>(`/api/v1/acquiring/chargebacks/${id}/representment`, { responseRef, evidence }),

  // ── PCI Compliance ─────────────────────────────────────────────────────────

  getPciComplianceReport: () =>
    apiGet<PciComplianceReport>('/api/v1/acquiring/compliance/pci'),

  // ── POS Terminals (PosTerminalController: /v1/pos-terminals) ───────────────

  getAllTerminals: () =>
    apiGet<PosTerminal[]>('/api/v1/pos-terminals'),

  registerTerminal: (payload: RegisterTerminalPayload) =>
    apiPost<PosTerminal>('/api/v1/pos-terminals', payload),

  updateTerminalStatus: (terminalId: string, status: string) =>
    apiPost<PosTerminal>(`/api/v1/pos-terminals/${encodeURIComponent(terminalId)}/status`, { status }),

  getTerminalsByMerchant: (merchantId: string) =>
    apiGet<PosTerminal[]>(`/api/v1/pos-terminals/merchant/${encodeURIComponent(merchantId)}`),
};
