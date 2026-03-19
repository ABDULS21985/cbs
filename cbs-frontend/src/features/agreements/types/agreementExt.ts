// Auto-generated from backend entities

export interface CustomerAgreement {
  id: number;
  agreementNumber: string;
  customerId: number;
  agreementType: string;
  title: string;
  description: string;
  documentRef: string;
  effectiveFrom: string;
  effectiveTo: string;
  autoRenew: boolean;
  renewalTermMonths: number;
  noticePeriodDays: number;
  signedByCustomer: string;
  signedByBank: string;
  signedDate: string;
  status: string;
  terminationReason: string;
  createdAt: string;
  updatedAt?: string;
}

