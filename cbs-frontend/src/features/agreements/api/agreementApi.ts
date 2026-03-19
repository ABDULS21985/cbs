import { apiGet, apiPost, apiPut } from '@/lib/api';

export interface Agreement {
  id: number;
  customerId: number;
  customerName: string;
  agreementCode: string;
  agreementType: 'TERMS_AND_CONDITIONS' | 'PRODUCT_AGREEMENT' | 'STANDING_MANDATE' | 'DIRECT_DEBIT_MANDATE' | 'NDA' | 'GENERAL';
  productCode?: string;
  productName?: string;
  templateId?: number;
  title: string;
  content: string;
  version: number;
  signedAt?: string;
  signatureData?: string;
  signatureType?: 'CANVAS' | 'TYPED';
  effectiveDate?: string;
  expiryDate?: string;
  linkedAccountId?: number;
  mandateAmountLimit?: number;
  mandateFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'SUPERSEDED';
  amendments?: Amendment[];
  createdAt: string;
  updatedAt: string;
}

export interface Amendment {
  id: number;
  description: string;
  changedBy: string;
  changedAt: string;
  previousVersion: number;
  newVersion: number;
}

export interface AgreementTemplate {
  id: number;
  name: string;
  type: Agreement['agreementType'];
  content: string;
  version: number;
  mergeFields: string[];
  isActive: boolean;
}

export const agreementApi = {
  getByCustomer: (customerId: number) =>
    apiGet<Agreement[]>(`/api/v1/agreements/customer/${customerId}`),
  getAll: (filters?: Record<string, unknown>) =>
    apiGet<Agreement[]>('/api/v1/agreements', filters),
  getById: (id: number) =>
    apiGet<Agreement>(`/api/v1/agreements/${id}`),
  create: (data: Partial<Agreement>) =>
    apiPost<Agreement>('/api/v1/agreements', data),
  sign: (id: number, signatureData: string, signatureType: 'CANVAS' | 'TYPED') =>
    apiPost<Agreement>(`/api/v1/agreements/${id}/sign`, { signatureData, signatureType }),
  terminate: (id: number, reason: string) =>
    apiPost<Agreement>(`/api/v1/agreements/${id}/terminate`, { reason }),
  amend: (id: number, data: Partial<Agreement>) =>
    apiPut<Agreement>(`/api/v1/agreements/${id}`, data),
  getTemplates: () =>
    apiGet<AgreementTemplate[]>('/api/v1/agreement-templates'),
};
