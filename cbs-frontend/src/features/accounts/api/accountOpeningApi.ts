import { apiGet, apiPost } from '@/lib/api';

export interface Product {
  id: string;
  name: string;
  type: 'SAVINGS' | 'CURRENT' | 'DOMICILIARY';
  currency: string;
  interestRate: number;
  minimumBalance: number;
  monthlyFee: number;
  features: string[];
  isSharia: boolean;
  eligible: boolean;
}

export interface CreateAccountRequest {
  customerId: string;
  productId: string;
  accountTitle: string;
  currency: string;
  initialDeposit: number;
  signatories?: { customerId: string; role: string }[];
  signingRule?: 'ANY_ONE' | 'ANY_TWO' | 'ALL';
  requestDebitCard: boolean;
  smsAlerts: boolean;
  eStatement: boolean;
}

export interface CreatedAccount {
  id: string;
  accountNumber: string;
  accountTitle: string;
  productName: string;
  currency: string;
  status: string;
  openedAt: string;
}

export interface ComplianceCheckRequest {
  customerId: string;
  productId: string;
}

export interface ComplianceCheckResult {
  kycVerified: boolean;
  kycLevel: string;
  amlClear: boolean;
  duplicateFound: boolean;
  dormantAccountExists: boolean;
  dormantAccountId?: string;
}

export interface CustomerSearchResult {
  id: string;
  fullName: string;
  type: 'INDIVIDUAL' | 'CORPORATE';
  segment: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  bvn?: string;
  phone: string;
  email: string;
}

export const accountOpeningApi = {
  getEligibleProducts: async (params: { type?: string; customerId?: string }): Promise<Product[]> => {
    return apiGet<Product[]>('/v1/products', { type: params.type || 'SAVINGS', eligible: true, customerId: params.customerId });
  },

  createAccount: async (data: CreateAccountRequest): Promise<CreatedAccount> => {
    return apiPost<CreatedAccount>('/v1/accounts', data);
  },

  runComplianceCheck: async (data: ComplianceCheckRequest): Promise<ComplianceCheckResult> => {
    return apiPost<ComplianceCheckResult>('/v1/accounts/compliance-check', data);
  },

  getCustomerAccounts: async (customerId: string): Promise<CreatedAccount[]> => {
    return apiGet<CreatedAccount[]>(`/v1/customers/${customerId}/accounts`);
  },

  searchCustomers: async (query: string): Promise<CustomerSearchResult[]> => {
    return apiGet<CustomerSearchResult[]>('/v1/customers', { search: query, limit: 10 });
  },
};
