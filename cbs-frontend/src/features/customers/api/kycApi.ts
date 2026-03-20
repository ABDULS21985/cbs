import { apiGet, apiPost, apiPatch } from '@/lib/api';

export const kycApi = {
  // Existing endpoints (already in customerApi - re-export for convenience)
  getStats: () => apiGet<Record<string, number>>('/api/v1/customers/kyc/stats'),
  getList: (params?: Record<string, unknown>) => apiGet('/api/v1/customers/kyc', params),

  // KYC decisions
  decide: (customerId: number, body: { decision: string; notes?: string; riskRating?: string }) =>
    apiPost(`/api/v1/customers/${customerId}/kyc/decide`, body),
  verifyDocument: (customerId: number, body: { documentId: number; decision: string; reason?: string }) =>
    apiPost(`/api/v1/customers/${customerId}/kyc/verify-document`, body),
  requestInfo: (customerId: number, message: string) =>
    apiPost(`/api/v1/customers/${customerId}/kyc/request-info`, { message }),
  updateStatus: (customerId: number, status: string) =>
    apiPatch(`/api/v1/customers/${customerId}/kyc/status?status=${encodeURIComponent(status)}`),

  // EDD
  initiateEdd: (customerId: number) =>
    apiPost(`/api/v1/customers/${customerId}/edd/initiate`),
  getEdd: (customerId: number) =>
    apiGet(`/api/v1/customers/${customerId}/edd`),
  updateEddChecklist: (customerId: number, data: Record<string, unknown>) =>
    apiPatch(`/api/v1/customers/${customerId}/edd/checklist`, data),
  approveEdd: (customerId: number, approvedBy: string) =>
    apiPost(`/api/v1/customers/${customerId}/edd/approve`, { approvedBy }),

  // Periodic Review
  getReviewsDue: () =>
    apiGet('/api/v1/customers/kyc/reviews-due'),
  completeReview: (customerId: number, reviewedBy: string) =>
    apiPost(`/api/v1/customers/${customerId}/kyc/complete-review`, { reviewedBy }),
};
