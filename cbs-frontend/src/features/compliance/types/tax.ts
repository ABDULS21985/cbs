// Auto-generated from backend entities

export interface TaxRule {
  id: number;
  taxCode: string;
  taxName: string;
  taxType: string;
  taxRate: number;
  appliesTo: string;
  thresholdAmount: number;
  currencyCode: string;
  exemptCustomerTypes: string;
  exemptProductCodes: string;
  taxReceivableGl: string;
  taxPayableGl: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  version: number;
}

export interface TaxTransaction {
  id: number;
  taxCode: string;
  taxType: string;
  sourceModule: string;
  sourceRef: string;
  accountId: number;
  customerId: number;
  baseAmount: number;
  taxRateApplied: number;
  taxAmount: number;
  currencyCode: string;
  journalId: number;
  status: string;
  remittanceRef: string;
  remittanceDate: string;
  createdAt: string;
  version: number;
}

