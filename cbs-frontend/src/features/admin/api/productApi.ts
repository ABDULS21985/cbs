export type ProductType = 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT' | 'LOAN' | 'CARD' | 'INVESTMENT';
export type ProductCategory = 'RETAIL' | 'SME' | 'CORPORATE' | 'ISLAMIC' | 'STAFF';
export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'RETIRED';
export type InterestType = 'FLAT' | 'REDUCING_BALANCE' | 'COMPOUND' | 'TIERED' | 'NONE';
export type CurrencyType = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'MULTI';

export interface RateTier {
  fromBalance: number;
  toBalance: number;
  rate: number;
}

export interface ProductFeeLink {
  feeId: string;
  feeName: string;
  feeCode: string;
  mandatory: boolean;
  waiverAuthority: 'OFFICER' | 'MANAGER' | 'ADMIN';
  occurrence: 'PER_TRANSACTION' | 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  amount: number;
}

export interface EligibilityRules {
  customerType: 'INDIVIDUAL' | 'CORPORATE' | 'JOINT' | 'ANY';
  minimumAge?: number;
  kycLevel: number;
  minimumOpeningBalance: number;
  segment: 'STANDARD' | 'PREMIUM' | 'ALL';
  existingProductRequired: string | null;
  geographicScope: 'ALL' | 'SPECIFIC';
}

export interface ProductLimits {
  dailyDebitLimit: number;
  dailyCreditLimit: number;
  perTransactionLimit: number;
  atmLimit: number;
  posLimit: number;
  onlineLimit: number;
  maxBalance: number;
  minimumBalance: number;
  overdraftAllowed: boolean;
  overdraftLimit?: number;
  dormancyDays: number;
  dormancyFee: number;
  channels: string[];
}

export interface BankingProduct {
  id: string;
  code: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  type: ProductType;
  category: ProductCategory;
  currency: CurrencyType;
  interestType: InterestType;
  interestRate?: number;
  rateTiers?: RateTier[];
  penaltyRate?: number;
  linkedFees: ProductFeeLink[];
  eligibility: EligibilityRules;
  limits: ProductLimits;
  status: ProductStatus;
  version: number;
  activeAccounts: number;
  totalBalance: number;
  revenueMTD: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBundle {
  id: string;
  name: string;
  description: string;
  products: string[];
  feeDiscount: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProductVersion {
  version: number;
  changedBy: string;
  changedAt: string;
  changes: { field: string; oldValue: string; newValue: string }[];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const MOCK_PRODUCTS: BankingProduct[] = [
  {
    id: 'prod-001',
    code: 'SAV-CLASSIC-001',
    name: 'Classic Savings Account',
    shortDescription: 'Standard retail savings account with competitive interest',
    longDescription:
      'Our flagship savings product designed for everyday retail customers. Offers competitive tiered interest rates, full digital banking access, and low minimum balance requirements. Ideal for salary earners and personal savers.',
    type: 'SAVINGS',
    category: 'RETAIL',
    currency: 'NGN',
    interestType: 'TIERED',
    rateTiers: [
      { fromBalance: 0, toBalance: 99999, rate: 1.5 },
      { fromBalance: 100000, toBalance: 999999, rate: 3.0 },
      { fromBalance: 1000000, toBalance: 999999999, rate: 4.5 },
    ],
    linkedFees: [
      {
        feeId: 'fee-001',
        feeName: 'Monthly Account Maintenance',
        feeCode: 'ACC-MAINT-001',
        mandatory: true,
        waiverAuthority: 'OFFICER',
        occurrence: 'MONTHLY',
        amount: 500,
      },
      {
        feeId: 'fee-006',
        feeName: 'ATM Withdrawal Fee (Off-us)',
        feeCode: 'TXN-ATM-001',
        mandatory: false,
        waiverAuthority: 'OFFICER',
        occurrence: 'PER_TRANSACTION',
        amount: 65,
      },
    ],
    eligibility: {
      customerType: 'INDIVIDUAL',
      minimumAge: 18,
      kycLevel: 1,
      minimumOpeningBalance: 1000,
      segment: 'ALL',
      existingProductRequired: null,
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 500000,
      dailyCreditLimit: 5000000,
      perTransactionLimit: 200000,
      atmLimit: 100000,
      posLimit: 300000,
      onlineLimit: 500000,
      maxBalance: 50000000,
      minimumBalance: 1000,
      overdraftAllowed: false,
      dormancyDays: 180,
      dormancyFee: 500,
      channels: ['Branch', 'Mobile', 'Web', 'USSD', 'ATM', 'POS'],
    },
    status: 'ACTIVE',
    version: 4,
    activeAccounts: 42350,
    totalBalance: 18750000000,
    revenueMTD: 21175000,
    createdAt: '2022-01-15T09:00:00Z',
    updatedAt: '2024-11-10T14:30:00Z',
  },
  {
    id: 'prod-002',
    code: 'SAV-PREMIUM-001',
    name: 'Premium Savings Account',
    shortDescription: 'High-yield savings for premium segment customers',
    longDescription:
      'Exclusive savings product for premium customers with higher balances. Offers preferential interest rates, dedicated relationship manager, and access to premium banking services.',
    type: 'SAVINGS',
    category: 'RETAIL',
    currency: 'NGN',
    interestType: 'TIERED',
    rateTiers: [
      { fromBalance: 0, toBalance: 499999, rate: 3.0 },
      { fromBalance: 500000, toBalance: 4999999, rate: 5.0 },
      { fromBalance: 5000000, toBalance: 999999999, rate: 7.0 },
    ],
    linkedFees: [
      {
        feeId: 'fee-008',
        feeName: 'Annual Card Maintenance',
        feeCode: 'CARD-MAINT-001',
        mandatory: true,
        waiverAuthority: 'MANAGER',
        occurrence: 'ANNUAL',
        amount: 1200,
      },
    ],
    eligibility: {
      customerType: 'INDIVIDUAL',
      minimumAge: 18,
      kycLevel: 2,
      minimumOpeningBalance: 500000,
      segment: 'PREMIUM',
      existingProductRequired: 'SAV-CLASSIC-001',
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 5000000,
      dailyCreditLimit: 50000000,
      perTransactionLimit: 2000000,
      atmLimit: 500000,
      posLimit: 2000000,
      onlineLimit: 5000000,
      maxBalance: 500000000,
      minimumBalance: 500000,
      overdraftAllowed: true,
      overdraftLimit: 2000000,
      dormancyDays: 365,
      dormancyFee: 0,
      channels: ['Branch', 'Mobile', 'Web', 'USSD', 'ATM', 'POS', 'Agent'],
    },
    status: 'ACTIVE',
    version: 2,
    activeAccounts: 8920,
    totalBalance: 47200000000,
    revenueMTD: 10726400,
    createdAt: '2022-06-01T09:00:00Z',
    updatedAt: '2024-09-15T11:00:00Z',
  },
  {
    id: 'prod-003',
    code: 'CURR-BIZ-001',
    name: 'Business Current Account',
    shortDescription: 'Full-featured current account for SME businesses',
    longDescription:
      'Comprehensive current account designed for small and medium enterprises. Supports high transaction volumes, cheque book facility, salary processing, and integration with business payment systems.',
    type: 'CURRENT',
    category: 'SME',
    currency: 'NGN',
    interestType: 'NONE',
    linkedFees: [
      {
        feeId: 'fee-005',
        feeName: 'Current Account Quarterly Maintenance',
        feeCode: 'ACC-MAINT-CURR',
        mandatory: true,
        waiverAuthority: 'MANAGER',
        occurrence: 'MONTHLY',
        amount: 2000,
      },
      {
        feeId: 'fee-002',
        feeName: 'Interbank Transfer Fee',
        feeCode: 'TXN-XFER-001',
        mandatory: false,
        waiverAuthority: 'MANAGER',
        occurrence: 'PER_TRANSACTION',
        amount: 500,
      },
    ],
    eligibility: {
      customerType: 'CORPORATE',
      kycLevel: 2,
      minimumOpeningBalance: 10000,
      segment: 'ALL',
      existingProductRequired: null,
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 50000000,
      dailyCreditLimit: 100000000,
      perTransactionLimit: 20000000,
      atmLimit: 500000,
      posLimit: 5000000,
      onlineLimit: 50000000,
      maxBalance: 1000000000,
      minimumBalance: 10000,
      overdraftAllowed: true,
      overdraftLimit: 5000000,
      dormancyDays: 365,
      dormancyFee: 1000,
      channels: ['Branch', 'Mobile', 'Web', 'ATM', 'POS'],
    },
    status: 'ACTIVE',
    version: 3,
    activeAccounts: 15620,
    totalBalance: 78500000000,
    revenueMTD: 31248000,
    createdAt: '2022-03-10T09:00:00Z',
    updatedAt: '2024-10-01T09:00:00Z',
  },
  {
    id: 'prod-004',
    code: 'FD-90DAY-001',
    name: '90-Day Fixed Deposit',
    shortDescription: 'Short-term fixed deposit with guaranteed returns',
    longDescription:
      'A 90-day fixed-term deposit offering guaranteed interest at maturity. Ideal for customers seeking short-term capital preservation with returns above standard savings rates.',
    type: 'FIXED_DEPOSIT',
    category: 'RETAIL',
    currency: 'NGN',
    interestType: 'FLAT',
    interestRate: 8.5,
    linkedFees: [],
    eligibility: {
      customerType: 'ANY',
      kycLevel: 1,
      minimumOpeningBalance: 50000,
      segment: 'ALL',
      existingProductRequired: 'SAV-CLASSIC-001',
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 0,
      dailyCreditLimit: 500000000,
      perTransactionLimit: 500000000,
      atmLimit: 0,
      posLimit: 0,
      onlineLimit: 0,
      maxBalance: 500000000,
      minimumBalance: 50000,
      overdraftAllowed: false,
      dormancyDays: 0,
      dormancyFee: 0,
      channels: ['Branch', 'Mobile', 'Web'],
    },
    status: 'ACTIVE',
    version: 2,
    activeAccounts: 6840,
    totalBalance: 34200000000,
    revenueMTD: 24233500,
    createdAt: '2022-05-20T09:00:00Z',
    updatedAt: '2024-08-30T12:00:00Z',
  },
  {
    id: 'prod-005',
    code: 'LOAN-PERSONAL-001',
    name: 'Personal Term Loan',
    shortDescription: 'Unsecured personal loans for retail customers',
    longDescription:
      'Flexible personal loan product with tenors from 3 to 36 months. Reducing balance interest calculation ensures fair repayment schedules. Available to salary earners with at least 6 months banking history.',
    type: 'LOAN',
    category: 'RETAIL',
    currency: 'NGN',
    interestType: 'REDUCING_BALANCE',
    interestRate: 22.0,
    penaltyRate: 5.0,
    linkedFees: [
      {
        feeId: 'fee-004',
        feeName: 'Loan Processing Fee',
        feeCode: 'LOAN-PROC-001',
        mandatory: true,
        waiverAuthority: 'ADMIN',
        occurrence: 'ONE_TIME',
        amount: 15000,
      },
    ],
    eligibility: {
      customerType: 'INDIVIDUAL',
      minimumAge: 21,
      kycLevel: 2,
      minimumOpeningBalance: 0,
      segment: 'ALL',
      existingProductRequired: 'SAV-CLASSIC-001',
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 0,
      dailyCreditLimit: 10000000,
      perTransactionLimit: 10000000,
      atmLimit: 0,
      posLimit: 0,
      onlineLimit: 0,
      maxBalance: 10000000,
      minimumBalance: 0,
      overdraftAllowed: false,
      dormancyDays: 0,
      dormancyFee: 0,
      channels: ['Branch', 'Mobile', 'Web'],
    },
    status: 'ACTIVE',
    version: 5,
    activeAccounts: 9240,
    totalBalance: 13860000000,
    revenueMTD: 25330800,
    createdAt: '2021-11-01T09:00:00Z',
    updatedAt: '2024-12-01T08:00:00Z',
  },
  {
    id: 'prod-006',
    code: 'CORP-CURR-001',
    name: 'Corporate Current Account',
    shortDescription: 'Premium current account for large corporate clients',
    longDescription:
      'Full-service current account product for large corporates with treasury management features, bulk payment capabilities, multi-signatory support, and dedicated corporate banking team access.',
    type: 'CURRENT',
    category: 'CORPORATE',
    currency: 'NGN',
    interestType: 'NONE',
    linkedFees: [
      {
        feeId: 'fee-007',
        feeName: 'Letter of Credit Issuance',
        feeCode: 'TRADE-LC-001',
        mandatory: false,
        waiverAuthority: 'ADMIN',
        occurrence: 'PER_TRANSACTION',
        amount: 50000,
      },
    ],
    eligibility: {
      customerType: 'CORPORATE',
      kycLevel: 3,
      minimumOpeningBalance: 100000,
      segment: 'ALL',
      existingProductRequired: null,
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 500000000,
      dailyCreditLimit: 1000000000,
      perTransactionLimit: 100000000,
      atmLimit: 1000000,
      posLimit: 50000000,
      onlineLimit: 500000000,
      maxBalance: 10000000000,
      minimumBalance: 100000,
      overdraftAllowed: true,
      overdraftLimit: 50000000,
      dormancyDays: 730,
      dormancyFee: 5000,
      channels: ['Branch', 'Web', 'Mobile'],
    },
    status: 'ACTIVE',
    version: 2,
    activeAccounts: 1240,
    totalBalance: 124000000000,
    revenueMTD: 18600000,
    createdAt: '2022-09-01T09:00:00Z',
    updatedAt: '2024-07-22T16:00:00Z',
  },
  {
    id: 'prod-007',
    code: 'ISL-SAV-001',
    name: 'Murabaha Savings Account',
    shortDescription: 'Sharia-compliant savings product (profit-sharing)',
    longDescription:
      'Islamic savings account based on Murabaha principles. Returns are paid as profit-sharing rather than interest, making it fully compliant with Islamic finance principles. Certified by the CBN Non-Interest Finance Advisory Board.',
    type: 'SAVINGS',
    category: 'ISLAMIC',
    currency: 'NGN',
    interestType: 'COMPOUND',
    interestRate: 4.0,
    linkedFees: [
      {
        feeId: 'fee-001',
        feeName: 'Monthly Account Maintenance',
        feeCode: 'ACC-MAINT-001',
        mandatory: false,
        waiverAuthority: 'OFFICER',
        occurrence: 'MONTHLY',
        amount: 250,
      },
    ],
    eligibility: {
      customerType: 'ANY',
      kycLevel: 1,
      minimumOpeningBalance: 5000,
      segment: 'ALL',
      existingProductRequired: null,
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 1000000,
      dailyCreditLimit: 10000000,
      perTransactionLimit: 500000,
      atmLimit: 200000,
      posLimit: 500000,
      onlineLimit: 1000000,
      maxBalance: 100000000,
      minimumBalance: 5000,
      overdraftAllowed: false,
      dormancyDays: 365,
      dormancyFee: 0,
      channels: ['Branch', 'Mobile', 'Web', 'USSD', 'ATM'],
    },
    status: 'ACTIVE',
    version: 1,
    activeAccounts: 3410,
    totalBalance: 8525000000,
    revenueMTD: 2842333,
    createdAt: '2023-04-01T09:00:00Z',
    updatedAt: '2023-04-01T09:00:00Z',
  },
  {
    id: 'prod-008',
    code: 'INV-TBILL-001',
    name: 'Treasury Bills Investment',
    shortDescription: 'Access to government T-Bill investments (91/182/364 day)',
    longDescription:
      'Investment product providing retail and corporate customers access to Federal Government of Nigeria Treasury Bills. Available in 91, 182, and 364-day tenors. Returns are paid at discounted rate at the start of the tenor.',
    type: 'INVESTMENT',
    category: 'RETAIL',
    currency: 'NGN',
    interestType: 'FLAT',
    interestRate: 18.5,
    linkedFees: [],
    eligibility: {
      customerType: 'ANY',
      kycLevel: 2,
      minimumOpeningBalance: 100000,
      segment: 'STANDARD',
      existingProductRequired: 'SAV-CLASSIC-001',
      geographicScope: 'ALL',
    },
    limits: {
      dailyDebitLimit: 0,
      dailyCreditLimit: 1000000000,
      perTransactionLimit: 1000000000,
      atmLimit: 0,
      posLimit: 0,
      onlineLimit: 0,
      maxBalance: 1000000000,
      minimumBalance: 100000,
      overdraftAllowed: false,
      dormancyDays: 0,
      dormancyFee: 0,
      channels: ['Branch', 'Mobile', 'Web'],
    },
    status: 'DRAFT',
    version: 1,
    activeAccounts: 0,
    totalBalance: 0,
    revenueMTD: 0,
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-01-10T09:00:00Z',
  },
];

const MOCK_BUNDLES: ProductBundle[] = [
  {
    id: 'bundle-001',
    name: 'Starter Banking Package',
    description:
      'Perfect entry package for new retail customers. Includes savings account and card product with bundled fee discount.',
    products: ['prod-001', 'prod-003'],
    feeDiscount: 20,
    status: 'ACTIVE',
  },
  {
    id: 'bundle-002',
    name: 'SME Growth Bundle',
    description:
      'Comprehensive bundle for growing SMEs including current account and term loan access with preferential fee treatment.',
    products: ['prod-003', 'prod-005'],
    feeDiscount: 15,
    status: 'ACTIVE',
  },
];

const MOCK_VERSIONS: Record<string, ProductVersion[]> = {
  'prod-001': [
    {
      version: 4,
      changedBy: 'Ngozi Eze (Product Manager)',
      changedAt: '2024-11-10T14:30:00Z',
      changes: [
        { field: 'rateTiers[2].rate', oldValue: '4.0', newValue: '4.5' },
        { field: 'limits.dailyDebitLimit', oldValue: '300000', newValue: '500000' },
      ],
    },
    {
      version: 3,
      changedBy: 'Tunde Adesanya (Treasury)',
      changedAt: '2024-06-01T10:00:00Z',
      changes: [
        { field: 'rateTiers[0].rate', oldValue: '1.0', newValue: '1.5' },
        { field: 'rateTiers[1].rate', oldValue: '2.5', newValue: '3.0' },
      ],
    },
    {
      version: 2,
      changedBy: 'Amara Okonkwo (Compliance)',
      changedAt: '2023-03-15T09:00:00Z',
      changes: [
        { field: 'eligibility.kycLevel', oldValue: '0', newValue: '1' },
        { field: 'linkedFees', oldValue: '1 fee linked', newValue: '2 fees linked' },
      ],
    },
    {
      version: 1,
      changedBy: 'System (Initial)',
      changedAt: '2022-01-15T09:00:00Z',
      changes: [{ field: 'status', oldValue: 'N/A', newValue: 'DRAFT' }],
    },
  ],
  'prod-005': [
    {
      version: 5,
      changedBy: 'Ibrahim Musa (Credit Risk)',
      changedAt: '2024-12-01T08:00:00Z',
      changes: [
        { field: 'interestRate', oldValue: '20.0', newValue: '22.0' },
        { field: 'penaltyRate', oldValue: '3.0', newValue: '5.0' },
      ],
    },
    {
      version: 4,
      changedBy: 'Fatima Al-Hassan (Product)',
      changedAt: '2024-03-20T11:30:00Z',
      changes: [
        { field: 'eligibility.minimumAge', oldValue: '18', newValue: '21' },
        { field: 'limits.maxBalance', oldValue: '5000000', newValue: '10000000' },
      ],
    },
    {
      version: 3,
      changedBy: 'Chidi Obi (Compliance)',
      changedAt: '2023-07-01T09:00:00Z',
      changes: [{ field: 'eligibility.kycLevel', oldValue: '1', newValue: '2' }],
    },
    {
      version: 2,
      changedBy: 'Bola Adeyemi (Operations)',
      changedAt: '2022-06-15T14:00:00Z',
      changes: [
        { field: 'linkedFees', oldValue: '0 fees linked', newValue: '1 fee linked' },
        { field: 'eligibility.existingProductRequired', oldValue: 'null', newValue: 'SAV-CLASSIC-001' },
      ],
    },
    {
      version: 1,
      changedBy: 'System (Initial)',
      changedAt: '2021-11-01T09:00:00Z',
      changes: [{ field: 'status', oldValue: 'N/A', newValue: 'DRAFT' }],
    },
  ],
};

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getProducts(params?: {
  status?: ProductStatus;
  type?: ProductType;
  category?: ProductCategory;
}): Promise<BankingProduct[]> {
  await delay(500);
  let results = [...MOCK_PRODUCTS];
  if (params?.status) results = results.filter((p) => p.status === params.status);
  if (params?.type) results = results.filter((p) => p.type === params.type);
  if (params?.category) results = results.filter((p) => p.category === params.category);
  return results;
}

export async function getProductById(id: string): Promise<BankingProduct> {
  await delay(400);
  const product = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!product) throw new Error(`Product ${id} not found`);
  return { ...product };
}

export async function createProduct(data: Partial<BankingProduct>): Promise<BankingProduct> {
  await delay(800);
  const newProduct: BankingProduct = {
    id: `prod-${Date.now()}`,
    code: data.code ?? `PROD-${Date.now()}`,
    name: data.name ?? 'Unnamed Product',
    shortDescription: data.shortDescription ?? '',
    longDescription: data.longDescription ?? '',
    type: data.type ?? 'SAVINGS',
    category: data.category ?? 'RETAIL',
    currency: data.currency ?? 'NGN',
    interestType: data.interestType ?? 'NONE',
    interestRate: data.interestRate,
    rateTiers: data.rateTiers,
    penaltyRate: data.penaltyRate,
    linkedFees: data.linkedFees ?? [],
    eligibility: data.eligibility ?? {
      customerType: 'ANY',
      kycLevel: 1,
      minimumOpeningBalance: 0,
      segment: 'ALL',
      existingProductRequired: null,
      geographicScope: 'ALL',
    },
    limits: data.limits ?? {
      dailyDebitLimit: 1000000,
      dailyCreditLimit: 5000000,
      perTransactionLimit: 500000,
      atmLimit: 100000,
      posLimit: 300000,
      onlineLimit: 1000000,
      maxBalance: 50000000,
      minimumBalance: 1000,
      overdraftAllowed: false,
      dormancyDays: 180,
      dormancyFee: 500,
      channels: ['Branch', 'Mobile', 'Web'],
    },
    status: 'DRAFT',
    version: 1,
    activeAccounts: 0,
    totalBalance: 0,
    revenueMTD: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_PRODUCTS.push(newProduct);
  return newProduct;
}

export async function updateProduct(id: string, data: Partial<BankingProduct>): Promise<BankingProduct> {
  await delay(700);
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);
  MOCK_PRODUCTS[idx] = {
    ...MOCK_PRODUCTS[idx],
    ...data,
    version: MOCK_PRODUCTS[idx].version + 1,
    updatedAt: new Date().toISOString(),
  };
  return { ...MOCK_PRODUCTS[idx] };
}

export async function publishProduct(id: string): Promise<BankingProduct> {
  await delay(600);
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);
  MOCK_PRODUCTS[idx] = { ...MOCK_PRODUCTS[idx], status: 'ACTIVE', updatedAt: new Date().toISOString() };
  return { ...MOCK_PRODUCTS[idx] };
}

export async function retireProduct(id: string): Promise<BankingProduct> {
  await delay(600);
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);
  MOCK_PRODUCTS[idx] = { ...MOCK_PRODUCTS[idx], status: 'RETIRED', updatedAt: new Date().toISOString() };
  return { ...MOCK_PRODUCTS[idx] };
}

export async function getBundles(): Promise<ProductBundle[]> {
  await delay(400);
  return [...MOCK_BUNDLES];
}

export async function createBundle(data: Partial<ProductBundle>): Promise<ProductBundle> {
  await delay(700);
  const newBundle: ProductBundle = {
    id: `bundle-${Date.now()}`,
    name: data.name ?? 'New Bundle',
    description: data.description ?? '',
    products: data.products ?? [],
    feeDiscount: data.feeDiscount ?? 0,
    status: 'ACTIVE',
  };
  MOCK_BUNDLES.push(newBundle);
  return newBundle;
}

export async function getProductVersions(id: string): Promise<ProductVersion[]> {
  await delay(400);
  return MOCK_VERSIONS[id] ?? [];
}
