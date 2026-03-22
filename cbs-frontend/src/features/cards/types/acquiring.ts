// ─── Acquiring Facility ─────────────────────────────────────────────────────

export type FacilityType = 'CARD_PRESENT' | 'CARD_NOT_PRESENT' | 'ECOMMERCE' | 'MPOS' | 'QR' | 'RECURRING';
export type ProcessorConnection = 'VISA' | 'MASTERCARD' | 'VERVE' | 'AMEX' | 'UNION_PAY';
export type SettlementCycle = 'T0' | 'T1' | 'T2';
export type FacilityStatus = 'SETUP' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type PciComplianceStatus = 'PENDING_SAQ' | 'SAQ_SUBMITTED' | 'COMPLIANT' | 'NON_COMPLIANT' | 'EXPIRED';

export interface AcquiringFacility {
  id: number;
  merchantId: number;
  facilityType: string;
  processorConnection: string;
  terminalIdPrefix: string;
  settlementCurrency: string;
  settlementCycle: string;
  mdrRatePct: number;
  dailyTransactionLimit: number;
  monthlyVolumeLimit: number;
  chargebackLimitPct: number;
  reserveHoldPct: number;
  reserveBalance: number;
  pciComplianceStatus: string;
  pciComplianceDate: string | null;
  fraudScreeningEnabled: boolean;
  threeDSecureEnabled: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Settlement ─────────────────────────────────────────────────────────────

export type SettlementStatus = 'CALCULATED' | 'APPROVED' | 'SETTLED' | 'DISPUTE';

export interface MerchantSettlement {
  id: number;
  merchantId: number;
  facilityId: number;
  settlementDate: string;
  grossTransactionAmount: number;
  transactionCount: number;
  mdrDeducted: number;
  otherFeesDeducted: number;
  chargebackDeductions: number;
  refundDeductions: number;
  reserveHeld: number;
  netSettlementAmount: number;
  settlementAccountId: number;
  settlementReference: string;
  settledAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Chargeback ─────────────────────────────────────────────────────────────

export type ChargebackStatus = 'RECEIVED' | 'NOTIFIED' | 'EVIDENCE_REQUESTED' | 'REPRESENTMENT' | 'ARBITRATION' | 'CLOSED';
export type ChargebackOutcome = 'MERCHANT_WIN' | 'MERCHANT_LOSS' | 'SPLIT' | 'PENDING';

export interface MerchantChargeback {
  id: number;
  merchantId: number;
  originalTransactionRef: string;
  transactionDate: string;
  transactionAmount: number;
  cardNetwork: string;
  reasonCode: string;
  reasonDescription: string;
  chargebackAmount: number;
  currency: string;
  evidenceDeadline: string | null;
  merchantResponseRef: string | null;
  merchantEvidence: Record<string, unknown> | null;
  representmentSubmitted: boolean;
  arbitrationRequired: boolean;
  outcome: string | null;
  financialImpact: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}
