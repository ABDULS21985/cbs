import api from '@/lib/api';
import type { ApiResponse, PaginationParams } from '@/types/common';
import type {
  Customer,
  CustomerListItem,
  CustomerFilters,
  CustomerCounts,
  CustomerAccount,
  CustomerLoan,
  CustomerCard,
  CustomerDocument,
  CustomerCase,
  CustomerTransaction,
  CustomerCommunication,
  CustomerSegment,
  OnboardingFormData,
  BvnVerifyResult,
  KycStats,
} from '../types/customer';

interface CustomerListResponse {
  items: CustomerListItem[];
  page: { page: number; size: number; totalElements: number; totalPages: number };
}

export const customerApi = {
  list: (filters: CustomerFilters) =>
    api.get<ApiResponse<CustomerListResponse>>('/v1/customers', { params: filters }),

  counts: (params?: { status?: string }) =>
    api.get<ApiResponse<CustomerCounts>>('/v1/customers/count', { params }),

  getById: (id: number) =>
    api.get<ApiResponse<Customer>>(`/v1/customers/${id}`),

  getAccounts: (id: number) =>
    api.get<ApiResponse<CustomerAccount[]>>(`/v1/customers/${id}/accounts`),

  getLoans: (id: number) =>
    api.get<ApiResponse<CustomerLoan[]>>(`/v1/customers/${id}/loans`),

  getCards: (id: number) =>
    api.get<ApiResponse<CustomerCard[]>>(`/v1/customers/${id}/cards`),

  getCases: (id: number) =>
    api.get<ApiResponse<CustomerCase[]>>(`/v1/customers/${id}/cases`),

  getDocuments: (id: number) =>
    api.get<ApiResponse<CustomerDocument[]>>(`/v1/customers/${id}/documents`),

  getTransactions: (id: number, params: PaginationParams & { accountId?: number }) =>
    api.get<ApiResponse<{ items: CustomerTransaction[]; page: object }>>(`/v1/customers/${id}/transactions`, { params }),

  getCommunications: (id: number) =>
    api.get<ApiResponse<CustomerCommunication[]>>(`/v1/customers/${id}/communications`),

  getAuditTrail: (id: number, params?: PaginationParams) =>
    api.get<ApiResponse<object[]>>(`/v1/audit`, {
      params: { entityType: 'CUSTOMER', entityId: id, ...params },
    }),

  submitOnboarding: (data: OnboardingFormData) =>
    api.post<ApiResponse<Customer>>('/v1/customers/onboarding', data),

  saveDraft: (data: Partial<OnboardingFormData>) =>
    api.post<ApiResponse<{ draftId: string }>>('/v1/customers/onboarding/draft', data),

  verifyBvn: (bvn: string, customerId?: string) =>
    api.post<ApiResponse<BvnVerifyResult>>('/v1/customers/verify-bvn', { bvn, customerId }),

  // KYC
  kycList: (params: { status?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<{ items: object[]; page: object }>>('/v1/customers/kyc', { params }),

  kycStats: () =>
    api.get<ApiResponse<KycStats>>('/v1/customers/kyc/stats'),

  kycVerifyDocument: (customerId: number, documentId: number, decision: 'VERIFIED' | 'REJECTED', reason?: string) =>
    api.post(`/v1/customers/${customerId}/documents/${documentId}/verify`, { decision, reason }),

  kycDecide: (customerId: number, decision: 'approve' | 'reject' | 'request_docs', notes?: string) =>
    api.post(`/v1/customers/${customerId}/kyc/decision`, { decision, notes }),

  // Segmentation
  getSegments: () =>
    api.get<ApiResponse<CustomerSegment[]>>('/v1/customers/segments'),
};
