import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH';
export type MerchantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export interface Merchant {
  id: number;
  businessName: string;
  registrationNumber: string;
  mcc: string;
  contactEmail: string;
  bankAccountId: number;
  riskCategory: RiskCategory;
  status: MerchantStatus;
  terminalCount?: number;
  lastSettlementDate?: string;
  createdAt: string;
}

export type SettlementFrequency = 'DAILY' | 'WEEKLY';
export type FacilityStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface AcquiringFacility {
  id: number;
  merchantId: number;
  merchantName?: string;
  settlementFrequency: SettlementFrequency;
  discountRate: number;
  terminalCount: number;
  status: FacilityStatus;
  activatedAt?: string;
  createdAt: string;
}

export type SettlementStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface MerchantSettlement {
  id: number;
  merchantId: number;
  merchantName?: string;
  fromDate: string;
  toDate: string;
  grossAmount: number;
  fees: number;
  netAmount: number;
  currency: string;
  status: SettlementStatus;
  processedAt?: string;
  createdAt: string;
}

export type ChargebackStatus = 'OPEN' | 'REPRESENTMENT' | 'RESOLVED' | 'LOST';

export interface Chargeback {
  id: number;
  merchantId: number;
  merchantName?: string;
  transactionRef: string;
  amount: number;
  currency: string;
  reason: string;
  status: ChargebackStatus;
  evidence?: string;
  representmentAmount?: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface PciComplianceReport {
  lastAuditDate: string;
  nextAuditDate: string;
  complianceLevel: string;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'IN_PROGRESS';
  assessorName?: string;
  reportRef?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const acquiringApi = {
  // Merchants
  getActiveMerchants: () =>
    apiGet<Merchant[]>('/v1/merchants/active'),

  getHighRiskMerchants: () =>
    apiGet<Merchant[]>('/v1/merchants/high-risk'),

  onboardMerchant: (payload: {
    businessName: string;
    registrationNumber: string;
    mcc: string;
    contactEmail: string;
    bankAccountId: number;
    riskCategory: RiskCategory;
  }) => apiPost<Merchant>('/v1/merchants', payload),

  activateMerchant: (id: number) =>
    apiPost<Merchant>(`/v1/merchants/${id}/activate`),

  suspendMerchant: (id: number, reason: string) =>
    apiPost<Merchant>(`/v1/merchants/${id}/suspend`, { reason }),

  // Facilities
  getMerchantFacilities: (merchantId: number) =>
    apiGet<AcquiringFacility[]>(`/v1/acquiring/facilities/merchant/${merchantId}`),

  setupFacility: (payload: {
    merchantId: number;
    settlementFrequency: SettlementFrequency;
    discountRate: number;
    terminalCount: number;
  }) => apiPost<AcquiringFacility>('/v1/acquiring/facilities', payload),

  activateFacility: (id: number) =>
    apiPut<AcquiringFacility>(`/v1/acquiring/facilities/${id}/activate`),

  // Settlements
  getMerchantSettlements: (merchantId: number) =>
    apiGet<MerchantSettlement[]>(`/v1/acquiring/settlements/merchant/${merchantId}`),

  processSettlement: (payload: { merchantId: number; fromDate: string; toDate: string }) =>
    apiPost<MerchantSettlement>('/v1/acquiring/settlements/process', payload),

  // Chargebacks
  getChargebacks: () =>
    apiGet<Chargeback[]>('/v1/acquiring/chargebacks'),

  recordChargeback: (payload: {
    merchantId: number;
    transactionRef: string;
    amount: number;
    reason: string;
  }) => apiPost<Chargeback>('/v1/acquiring/chargebacks', payload),

  submitRepresentment: (id: number, payload: { evidence: string; amount: number }) =>
    apiPost<Chargeback>(`/v1/acquiring/chargebacks/${id}/representment`, payload),

  // PCI Compliance
  getPciComplianceReport: () =>
    apiGet<PciComplianceReport>('/v1/acquiring/compliance/pci'),
};
