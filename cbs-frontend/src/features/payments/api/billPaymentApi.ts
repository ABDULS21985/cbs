import { apiGet, apiPost, apiPut } from '@/lib/api';

export interface BillerCategory {
  code: string;
  name: string;
  icon: string;
  billerCount: number;
}

export interface Biller {
  id: number;
  code: string;
  name: string;
  categoryCode: string;
  logoUrl?: string;
  fields: BillerField[];
  isFixedAmount: boolean;
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  commission: number;
  commissionType: 'FLAT' | 'PERCENTAGE';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface BillerField {
  name: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT';
  required: boolean;
  options?: string[];
  validation?: string;
}

export interface BillValidationResult {
  customerName: string;
  outstandingBalance?: number;
  meterToken?: string;
  referenceValid: boolean;
}

export interface BillPaymentRequest {
  billerId: number;
  sourceAccountId: number;
  amount: number;
  fields: Record<string, string>;
  saveFavorite?: boolean;
}

export interface BillPaymentResponse {
  id: number;
  transactionRef: string;
  billerName: string;
  amount: number;
  fee: number;
  totalDebit: number;
  token?: string;
  confirmationNumber?: string;
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  paidAt: string;
}

export interface BillFavorite {
  id: number;
  billerName: string;
  billerCode: string;
  categoryCode: string;
  fields: Record<string, string>;
  alias?: string;
  lastPaidAmount: number;
  lastPaidAt: string;
}

export const billPaymentApi = {
  getCategories: () =>
    apiGet<BillerCategory[]>('/api/v1/bills/categories'),
  getBillersByCategory: (categoryCode: string) =>
    apiGet<Biller[]>(`/api/v1/bills/categories/${categoryCode}/billers`),
  validateReference: (billerId: number, fields: Record<string, string>) =>
    apiPost<BillValidationResult>('/api/v1/bills/validate', { billerId, fields }),
  payBill: (data: BillPaymentRequest) =>
    apiPost<BillPaymentResponse>('/api/v1/bills/pay', data),
  getFavorites: () =>
    apiGet<BillFavorite[]>('/api/v1/bills/favorites'),
  saveFavorite: (data: Partial<BillFavorite>) =>
    apiPost<BillFavorite>('/api/v1/bills/favorites', data),
  removeFavorite: (id: number) =>
    apiPost<void>(`/api/v1/bills/favorites/${id}/remove`, {}),
  // Admin
  getAllBillers: (filters?: Record<string, unknown>) =>
    apiGet<Biller[]>('/api/v1/admin/billers', filters),
  onboardBiller: (data: Partial<Biller>) =>
    apiPost<Biller>('/api/v1/admin/billers', data),
  updateBiller: (id: number, data: Partial<Biller>) =>
    apiPut<Biller>(`/api/v1/admin/billers/${id}`, data),
};
