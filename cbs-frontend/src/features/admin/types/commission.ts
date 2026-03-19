// Auto-generated from backend entities

export interface CommissionAgreement {
  id: number;
  agreementCode: string;
  agreementName: string;
  agreementType: string;
  partyId: string;
  partyName: string;
  commissionBasis: string;
  baseRatePct: number;
  tierStructure: Record<string, unknown>[];
  applicableProducts: string[];
  minPayout: number;
  maxPayoutMonthly: number;
  maxPayoutAnnual: number;
  clawbackPeriodDays: number;
  clawbackConditions: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
}

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
  status: string;
}
