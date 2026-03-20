import { apiGet, apiPost } from '@/lib/api';

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

// ─── API Functions ────────────────────────────────────────────────────────────

export function getProducts(params?: {
  status?: ProductStatus;
  type?: ProductType;
  category?: ProductCategory;
}): Promise<BankingProduct[]> {
  return apiGet<BankingProduct[]>('/api/v1/products', params as Record<string, unknown>);
}

export function getProductById(id: string): Promise<BankingProduct> {
  return apiGet<BankingProduct>(`/api/v1/products/${id}`);
}

export function createProduct(data: Partial<BankingProduct>): Promise<BankingProduct> {
  return apiPost<BankingProduct>('/api/v1/products', data);
}

export function updateProduct(id: string, data: Partial<BankingProduct>): Promise<BankingProduct> {
  return apiPost<BankingProduct>(`/api/v1/products/${id}`, data);
}

export function publishProduct(id: string): Promise<BankingProduct> {
  return apiPost<BankingProduct>(`/api/v1/products/${id}/publish`);
}

export function retireProduct(id: string): Promise<BankingProduct> {
  return apiPost<BankingProduct>(`/api/v1/products/${id}/retire`);
}

export function getBundles(): Promise<ProductBundle[]> {
  return apiGet<ProductBundle[]>('/api/v1/products/bundles');
}

export function createBundle(data: Partial<ProductBundle>): Promise<ProductBundle> {
  return apiPost<ProductBundle>('/api/v1/products/bundles', data);
}

export function getProductVersions(id: string): Promise<ProductVersion[]> {
  return apiGet<ProductVersion[]>(`/api/v1/products/${id}/versions`);
}
