import { apiGet, apiPost } from '@/lib/api';

type ProductType = 'SAVINGS' | 'CURRENT' | 'DOMICILIARY';
type CustomerType = 'INDIVIDUAL' | 'CORPORATE';

export interface Product {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  productCategory: string;
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
  customerType?: CustomerType;
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
  type: CustomerType;
  segment: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  bvn?: string;
  phone: string;
  email: string;
}

interface BackendProduct {
  id: number;
  code: string;
  name: string;
  productCategory: string;
  currencyCode: string;
  minOpeningBalance?: number | null;
  monthlyMaintenanceFee?: number | null;
  baseInterestRate?: number | null;
  allowsDebitCard?: boolean | null;
  allowsMobile?: boolean | null;
  allowsInternet?: boolean | null;
  allowsChequeBook?: boolean | null;
  allowsOverdraft?: boolean | null;
  interestBearing?: boolean | null;
  isActive?: boolean | null;
}

interface BackendCustomerSummary {
  id: number;
  fullName?: string;
  type?: CustomerType;
  displayName?: string;
  customerType?: CustomerType;
  email?: string | null;
  phone?: string | null;
  phonePrimary?: string | null;
}

interface BackendCustomerIdentification {
  idType?: string;
  idNumber?: string;
  isVerified?: boolean;
}

interface BackendCustomerDetail {
  id: number;
  customerType: CustomerType;
  fullName?: string;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  phonePrimary?: string | null;
  status?: string | null;
  riskRating?: string | null;
  metadata?: Record<string, unknown> | null;
  identifications?: BackendCustomerIdentification[] | null;
}

interface BackendSignatory {
  customerDisplayName?: string | null;
  signatoryType?: string | null;
}

interface BackendAccountResponse {
  id: number;
  accountNumber: string;
  accountName?: string | null;
  productName?: string | null;
  status?: string | null;
  currency?: string | null;
  signatories?: BackendSignatory[] | null;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function mapProductType(productCategory: string, currencyCode: string): ProductType {
  if (productCategory === 'CURRENT') {
    return 'CURRENT';
  }

  if (productCategory === 'NOSTRO' || productCategory === 'VOSTRO' || currencyCode !== 'NGN') {
    return 'DOMICILIARY';
  }

  return 'SAVINGS';
}

function buildProductFeatures(product: BackendProduct): string[] {
  const features = [
    product.allowsDebitCard ? 'Debit card supported' : null,
    product.allowsChequeBook ? 'Cheque book available' : null,
    product.allowsMobile ? 'Mobile banking enabled' : null,
    product.allowsInternet ? 'Internet banking enabled' : null,
    product.allowsOverdraft ? 'Overdraft eligible' : null,
    product.interestBearing ? 'Interest bearing' : null,
  ].filter((feature): feature is string => feature !== null);

  return features.length > 0 ? features : ['Standard account servicing'];
}

function mapProduct(product: BackendProduct): Product {
  return {
    id: product.code,
    code: product.code,
    name: product.name,
    type: mapProductType(product.productCategory, product.currencyCode),
    productCategory: product.productCategory,
    currency: product.currencyCode,
    interestRate: toNumber(product.baseInterestRate),
    minimumBalance: toNumber(product.minOpeningBalance),
    monthlyFee: toNumber(product.monthlyMaintenanceFee),
    features: buildProductFeatures(product),
    isSharia: false,
    eligible: product.isActive !== false,
  };
}

function deriveKycStatus(customer: BackendCustomerDetail): CustomerSearchResult['kycStatus'] {
  const identifications = customer.identifications ?? [];
  if (identifications.some((identification) => identification.isVerified)) {
    return 'VERIFIED';
  }

  if (customer.status === 'SUSPENDED' || customer.status === 'CLOSED' || customer.status === 'DECEASED') {
    return 'REJECTED';
  }

  return 'PENDING';
}

function deriveSegment(customer: BackendCustomerDetail): string {
  const metadataSegment = customer.metadata?.segment;
  if (typeof metadataSegment === 'string' && metadataSegment.trim().length > 0) {
    return metadataSegment;
  }

  return customer.customerType === 'CORPORATE' ? 'Business' : 'Retail';
}

function mapCustomer(summary: BackendCustomerSummary, detail: BackendCustomerDetail): CustomerSearchResult {
  const identifications = detail.identifications ?? [];
  const bvn = identifications.find((identification) => identification.idType?.toUpperCase() === 'BVN')?.idNumber;

  return {
    id: String(detail.id),
    fullName: detail.fullName ?? detail.displayName ?? summary.fullName ?? summary.displayName ?? 'Unnamed customer',
    type: detail.customerType ?? summary.type ?? summary.customerType ?? 'INDIVIDUAL',
    segment: deriveSegment(detail),
    kycStatus: deriveKycStatus(detail),
    bvn,
    phone: detail.phone ?? detail.phonePrimary ?? summary.phone ?? summary.phonePrimary ?? 'N/A',
    email: detail.email ?? summary.email ?? 'N/A',
  };
}

function mapCreatedAccount(account: BackendAccountResponse): CreatedAccount {
  return {
    id: String(account.id),
    accountNumber: account.accountNumber,
    accountTitle: account.accountName ?? account.accountNumber,
    productName: account.productName ?? 'Account product',
    currency: account.currency ?? 'NGN',
    status: account.status ?? 'ACTIVE',
    openedAt: new Date().toISOString(),
  };
}

function mapSigningRule(signingRule?: CreateAccountRequest['signingRule']): string {
  if (signingRule === 'ALL') {
    return 'ALL';
  }

  if (signingRule === 'ANY_TWO') {
    return 'ANY_TWO';
  }

  return 'ANY';
}

function mapSignatoryType(role: string, index: number): string {
  const normalized = role.trim().toUpperCase();
  if (index === 0 || normalized.includes('PRIMARY')) {
    return 'PRIMARY';
  }

  if (normalized.includes('MANAGING') || normalized.includes('FINANCE') || normalized.includes('AUTHORI')) {
    return 'AUTHORISED';
  }

  if (normalized.includes('MANDATE')) {
    return 'MANDATE';
  }

  return 'JOINT';
}

function resolveAccountType(data: CreateAccountRequest): string {
  if ((data.signatories?.length ?? 0) > 0) {
    return data.customerType === 'CORPORATE' ? 'CORPORATE' : 'JOINT';
  }

  return data.customerType === 'CORPORATE' ? 'CORPORATE' : 'INDIVIDUAL';
}

export const accountOpeningApi = {
  getEligibleProducts: async (params: { type?: string; customerId?: string }): Promise<Product[]> => {
    const products = await apiGet<BackendProduct[]>('/api/v1/accounts/products');
    const mappedProducts = products.map(mapProduct).filter((product) => product.eligible);

    if (!params.type || params.type === 'ALL') {
      return mappedProducts;
    }

    return mappedProducts.filter((product) => product.type === params.type);
  },

  createAccount: async (data: CreateAccountRequest): Promise<CreatedAccount> => {
    const created = await apiPost<BackendAccountResponse>('/api/v1/accounts', {
      customerId: Number(data.customerId),
      productCode: data.productId,
      accountType: resolveAccountType(data),
      accountName: data.accountTitle,
      currencyCode: data.currency,
      initialDeposit: data.initialDeposit,
      signatories: data.signatories?.map((signatory, index) => ({
        customerId: Number(signatory.customerId),
        signatoryType: mapSignatoryType(signatory.role, index),
        signingRule: mapSigningRule(data.signingRule),
      })),
    });

    return mapCreatedAccount(created);
  },

  runComplianceCheck: async (data: ComplianceCheckRequest): Promise<ComplianceCheckResult> => {
    return apiPost<ComplianceCheckResult>('/api/v1/accounts/compliance-check', {
      customerId: Number(data.customerId),
      productCode: data.productId,
    });
  },

  getCustomerAccounts: async (customerId: string): Promise<CreatedAccount[]> => {
    const accounts = await apiGet<BackendAccountResponse[]>(`/api/v1/accounts/customer/${customerId}`);
    return accounts.map(mapCreatedAccount);
  },

  getCustomerById: async (customerId: string): Promise<CustomerSearchResult> => {
    const detail = await apiGet<BackendCustomerDetail>(`/api/v1/customers/${customerId}`);

    return mapCustomer(
      {
        id: detail.id,
        fullName: detail.fullName ?? detail.displayName,
        type: detail.customerType,
        customerType: detail.customerType,
        email: detail.email,
        phone: detail.phone,
        phonePrimary: detail.phonePrimary,
      },
      detail,
    );
  },

  searchCustomers: async (query: string): Promise<CustomerSearchResult[]> => {
    const summaries = await apiGet<BackendCustomerSummary[]>('/api/v1/customers/quick-search', { q: query, size: 10 });
    const customers = await Promise.all(
      summaries.map(async (summary) => {
        const detail = await apiGet<BackendCustomerDetail>(`/api/v1/customers/${summary.id}`);
        return mapCustomer(summary, detail);
      }),
    );

    return customers;
  },
};
