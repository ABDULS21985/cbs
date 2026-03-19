// Auto-generated from backend entities

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

