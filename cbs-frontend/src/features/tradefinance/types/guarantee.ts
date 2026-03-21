// Auto-generated from backend entities

export type GuaranteeType = 'PERFORMANCE' | 'BID_BOND' | 'ADVANCE_PAYMENT' | 'CUSTOMS' | 'FINANCIAL' | 'PAYMENT' | 'RETENTION' | 'WARRANTY' | 'SHIPPING' | 'OTHER';
export type GuaranteeStatus = 'DRAFT' | 'ISSUED' | 'ACTIVE' | 'CLAIMED' | 'PARTIALLY_CLAIMED' | 'EXPIRED' | 'CANCELLED' | 'RELEASED';

interface Customer { id: number; name?: string; [key: string]: unknown; }
interface Account { id: number; accountNumber?: string; [key: string]: unknown; }
interface Collateral { id: number; [key: string]: unknown; }

export interface BankGuarantee {
  id: number;
  guaranteeNumber: string;
  guaranteeType: GuaranteeType;
  applicant: Customer;
  beneficiaryName: string;
  beneficiaryAddress: string;
  amount: number;
  currencyCode: string;
  issueDate: string;
  expiryDate: string;
  claimExpiryDate: string;
  autoExtend: boolean;
  extensionPeriodDays: number;
  underlyingContractRef: string;
  purpose: string;
  governingLaw: string;
  isDemandGuarantee: boolean;
  claimConditions: string[];
  marginAccount: Account;
  marginPercentage: number;
  marginAmount: number;
  collateral: Collateral;
  commissionRate: number;
  commissionAmount: number;
  claimedAmount: number;
  status: GuaranteeStatus;
}
