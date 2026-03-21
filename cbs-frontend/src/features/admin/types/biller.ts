export type BillerCategory =
  | 'ELECTRICITY'
  | 'WATER'
  | 'INTERNET'
  | 'TV'
  | 'INSURANCE'
  | 'GOVERNMENT'
  | 'EDUCATION'
  | 'TELECOMMUNICATIONS'
  | 'OTHERS';

export interface Biller {
  id: number;
  billerCode: string;
  billerName: string;
  billerCategory: BillerCategory;
  settlementBankCode: string | null;
  settlementAccountNumber: string | null;
  customerIdLabel: string;
  customerIdRegex: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  currencyCode: string;
  flatFee: number;
  percentageFee: number;
  feeCap: number | null;
  feeBearer: 'CUSTOMER' | 'BILLER' | 'SPLIT';
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillerCreateRequest {
  billerCode: string;
  billerName: string;
  billerCategory: BillerCategory;
  settlementBankCode?: string;
  settlementAccountNumber?: string;
  customerIdLabel?: string;
  customerIdRegex?: string;
  minAmount?: number;
  maxAmount?: number;
  currencyCode: string;
  flatFee?: number;
  percentageFee?: number;
  feeCap?: number;
  feeBearer?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}
