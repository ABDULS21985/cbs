// Auto-generated from backend entities

export interface RemittanceBeneficiary {
  id: number;
  customerId: number;
  beneficiaryName: string;
  beneficiaryCountry: string;
  beneficiaryCity: string;
  bankName: string;
  bankCode: string;
  bankSwiftCode: string;
  accountNumber: string;
  iban: string;
  mobileNumber: string;
  mobileProvider: string;
  idType: string;
  idNumber: string;
  relationship: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

export interface RemittanceCorridor {
  id: number;
  corridorCode: string;
  sourceCountry: string;
  destinationCountry: string;
  sourceCurrency: string;
  destinationCurrency: string;
  flatFee: number;
  percentageFee: number;
  feeCap: number;
  fxMarkupPct: number;
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  requiresPurposeCode: boolean;
  requiresSourceOfFunds: boolean;
  blockedPurposeCodes: string[];
  preferredRailCode: string;
  settlementDays: number;
  imtoPartnerCode: string;
  imtoPartnerName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

export interface RemittanceTransaction {
  id: number;
  remittanceRef: string;
  senderCustomerId: number;
  senderAccountId: number;
  beneficiaryId: number;
  corridorId: number;
  sourceAmount: number;
  sourceCurrency: string;
  destinationAmount: number;
  destinationCurrency: string;
  fxRate: number;
  fxMarkup: number;
  flatFee: number;
  percentageFee: number;
  totalFee: number;
  totalDebitAmount: number;
  purposeCode: string;
  purposeDescription: string;
  sourceOfFunds: string;
  sanctionsCheckRef: string;
  sanctionsCheckStatus: string;
  paymentRailCode: string;
  partnerRef: string;
  status: string;
  statusMessage: string;
  initiatedAt: string;
  sentAt: string;
  deliveredAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

