export interface CreditFacility {
  id: number;
  facilityNumber: string;
  customerId: number;
  customerName: string;
  type: 'REVOLVING' | 'TERM' | 'OVERDRAFT' | 'GUARANTEE' | 'LC';
  approvedLimit: number;
  utilized: number;
  available: number;
  currency: string;
  expiryDate: string;
  approvedDate: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  reviewDate?: string;
}

export interface SubLimit {
  id: number;
  facilityId: number;
  subLimitType: 'OVERDRAFT' | 'TERM_LOAN' | 'BANK_GUARANTEE' | 'LETTER_OF_CREDIT' | 'IMPORT_FINANCE';
  allocated: number;
  used: number;
  available: number;
  productName: string;
}

export interface Drawdown {
  id: number;
  facilityId: number;
  reference: string;
  date: string;
  amount: number;
  type: string;
  rate: number;
  maturityDate: string;
  status: 'ACTIVE' | 'SETTLED' | 'OVERDUE' | 'PENDING';
}

export interface UtilizationPoint {
  date: string;
  utilized: number;
  limit: number;
}

export interface Covenant {
  id: number;
  covenant: string;
  threshold: string;
  current: string;
  compliance: 'COMPLIANT' | 'BREACHED' | 'APPROACHING';
  nextTestDate: string;
}

export interface DrawdownRequest {
  facilityId: number;
  amount: number;
  narration?: string;
}

// Matches backend CreateFacilityRequest DTO
export interface CreateFacilityPayload {
  accountId: number;
  facilityType: 'OVERDRAFT' | 'LINE_OF_CREDIT' | 'REVOLVING';
  sanctionedLimit: number;
  interestRate: number;
  penaltyRate?: number;
  dayCountConvention?: string;
  expiryDate: string;
  autoRenewal?: boolean;
  maxRenewals?: number;
  interestPostingDay?: number;
}
