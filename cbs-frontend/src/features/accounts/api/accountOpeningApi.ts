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

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'DigiSave Classic',
    type: 'SAVINGS',
    currency: 'NGN',
    interestRate: 4.5,
    minimumBalance: 5000,
    monthlyFee: 0,
    features: ['Free internet banking', 'SMS alerts', 'ATM card', 'Mobile banking'],
    isSharia: false,
    eligible: true,
  },
  {
    id: 'prod-002',
    name: 'DigiSave Premium',
    type: 'SAVINGS',
    currency: 'NGN',
    interestRate: 7.25,
    minimumBalance: 100000,
    monthlyFee: 500,
    features: ['Higher interest rate', 'Dedicated relationship manager', 'Unlimited transfers', 'Priority support', 'Investment advisory'],
    isSharia: false,
    eligible: true,
  },
  {
    id: 'prod-003',
    name: 'HalalSave',
    type: 'SAVINGS',
    currency: 'NGN',
    interestRate: 0,
    minimumBalance: 10000,
    monthlyFee: 0,
    features: ['Sharia-compliant', 'Profit sharing model', 'No interest charged or paid', 'Ethical investment only'],
    isSharia: true,
    eligible: true,
  },
  {
    id: 'prod-004',
    name: 'Business Current',
    type: 'CURRENT',
    currency: 'NGN',
    interestRate: 0,
    minimumBalance: 50000,
    monthlyFee: 2000,
    features: ['Unlimited transactions', 'Overdraft facility', 'Bulk payment processing', 'Dedicated account officer', 'Cheque book'],
    isSharia: false,
    eligible: true,
  },
  {
    id: 'prod-005',
    name: 'Premium Current',
    type: 'CURRENT',
    currency: 'NGN',
    interestRate: 0,
    minimumBalance: 500000,
    monthlyFee: 5000,
    features: ['Unlimited transactions', 'High overdraft limit', 'Priority processing', 'Free SWIFT transfers', 'Dedicated RM'],
    isSharia: false,
    eligible: true,
  },
  {
    id: 'prod-006',
    name: 'DigiDom Account',
    type: 'DOMICILIARY',
    currency: 'USD',
    interestRate: 1.5,
    minimumBalance: 100,
    monthlyFee: 10,
    features: ['Multi-currency support', 'International transfers', 'SWIFT access', 'Forex conversion', 'Cross-border payments'],
    isSharia: false,
    eligible: true,
  },
];

const MOCK_CUSTOMERS: CustomerSearchResult[] = [
  {
    id: 'cust-001',
    fullName: 'Amara Okonkwo',
    type: 'INDIVIDUAL',
    segment: 'RETAIL',
    kycStatus: 'VERIFIED',
    bvn: '22312345678',
    phone: '+234 801 234 5678',
    email: 'amara.okonkwo@gmail.com',
  },
  {
    id: 'cust-002',
    fullName: 'TechVentures Nigeria Ltd',
    type: 'CORPORATE',
    segment: 'SME',
    kycStatus: 'VERIFIED',
    phone: '+234 802 345 6789',
    email: 'finance@techventures.ng',
  },
  {
    id: 'cust-003',
    fullName: 'Ibrahim Musa',
    type: 'INDIVIDUAL',
    segment: 'RETAIL',
    kycStatus: 'PENDING',
    bvn: '22398765432',
    phone: '+234 803 456 7890',
    email: 'ibrahim.musa@yahoo.com',
  },
  {
    id: 'cust-004',
    fullName: 'Chidi Enterprises',
    type: 'CORPORATE',
    segment: 'CORPORATE',
    kycStatus: 'VERIFIED',
    phone: '+234 804 567 8901',
    email: 'admin@chidienterprises.ng',
  },
  {
    id: 'cust-005',
    fullName: 'Fatima Al-Hassan',
    type: 'INDIVIDUAL',
    segment: 'PREMIUM',
    kycStatus: 'VERIFIED',
    bvn: '22311223344',
    phone: '+234 805 678 9012',
    email: 'fatima.alhassan@outlook.com',
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const accountOpeningApi = {
  getEligibleProducts: async (params: { type?: string; customerId?: string }): Promise<Product[]> => {
    if (IS_DEMO) {
      await delay(600);
      let products = MOCK_PRODUCTS.filter((p) => p.eligible);
      if (params.type) products = products.filter((p) => p.type === params.type);
      return products;
    }
    return apiGet<Product[]>('/v1/products', { type: params.type || 'SAVINGS', eligible: true, customerId: params.customerId });
  },

  createAccount: async (data: CreateAccountRequest): Promise<CreatedAccount> => {
    if (IS_DEMO) {
      await delay(1200);
      const accountNumber = '0' + Math.floor(Math.random() * 9_000_000_000 + 1_000_000_000).toString();
      return {
        id: 'acc-' + Date.now(),
        accountNumber,
        accountTitle: data.accountTitle,
        productName: MOCK_PRODUCTS.find((p) => p.id === data.productId)?.name || 'Savings Account',
        currency: data.currency,
        status: 'ACTIVE',
        openedAt: new Date().toISOString(),
      };
    }
    return apiPost<CreatedAccount>('/v1/accounts', data);
  },

  runComplianceCheck: async (data: ComplianceCheckRequest): Promise<ComplianceCheckResult> => {
    if (IS_DEMO) {
      await delay(1500);
      return {
        kycVerified: true,
        kycLevel: 'TIER_3',
        amlClear: true,
        duplicateFound: false,
        dormantAccountExists: false,
      };
    }
    return apiPost<ComplianceCheckResult>('/v1/accounts/compliance-check', data);
  },

  getCustomerAccounts: async (customerId: string): Promise<CreatedAccount[]> => {
    if (IS_DEMO) {
      await delay(500);
      return [];
    }
    return apiGet<CreatedAccount[]>(`/v1/customers/${customerId}/accounts`);
  },

  searchCustomers: async (query: string): Promise<CustomerSearchResult[]> => {
    if (IS_DEMO) {
      await delay(400);
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return MOCK_CUSTOMERS.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.bvn && c.bvn.includes(q)),
      );
    }
    return apiGet<CustomerSearchResult[]>('/v1/customers', { search: query, limit: 10 });
  },
};
