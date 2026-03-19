// Auto-generated from backend entities

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
  pciComplianceDate: string;
  fraudScreeningEnabled: boolean;
  threeDSecureEnabled: boolean;
  status: string;
}

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
  settledAt: string;
  status: string;
}

