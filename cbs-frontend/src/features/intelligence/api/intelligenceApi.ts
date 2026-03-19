import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';

export interface Recommendation {
  id: number;
  customerId: string;
  productName: string;
  productType: string;
  score: number;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  generatedAt: string;
  respondedAt?: string;
  declineReason?: string;
}

export interface ChurnScore {
  customerId: string;
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  segment: string;
  factors: { name: string; impact: number }[];
  computedAt: string;
}

export interface CashFlowForecast {
  id: number;
  entityType: string;
  entityId: string;
  horizonDays: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'APPROVED' | 'FAILED';
  netPosition: number;
  inflows: number;
  outflows: number;
  confidence: number;
  forecastDate: string;
  approvedAt?: string;
  approvedBy?: string;
  dataPoints: { date: string; inflow: number; outflow: number; net: number }[];
}

export interface DocumentJob {
  id: number;
  jobId: string;
  documentType: string;
  documentRef?: string;
  status: 'PROCESSING' | 'REVIEW_NEEDED' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  extractedFields?: Record<string, string>;
}

export const intelligenceApi = {
  // Behaviour — Recommendations
  getRecommendations: (customerId: string) =>
    apiGet<Recommendation[]>(`/v1/intelligence/behaviour/recommendations/${customerId}`),

  generateRecommendations: (customerId: string) =>
    apiPost<Recommendation[]>(`/v1/intelligence/behaviour/recommendations/${customerId}/generate`),

  respondToRecommendation: (id: number, action: 'ACCEPT' | 'DECLINE', reason?: string) =>
    apiPost<Recommendation>(`/v1/intelligence/behaviour/recommendations/${id}/respond`, { action, reason }),

  // Behaviour — Churn
  getChurnScore: (customerId: string) =>
    apiGet<ChurnScore>(`/v1/intelligence/behaviour/churn-score/${customerId}`),

  // Cash Flow Forecasting
  generateForecast: (payload: {
    entityType: string;
    entityId: string;
    horizonDays: number;
    currency: string;
  }) => apiPost<CashFlowForecast>('/v1/intelligence/cashflow/forecast', payload),

  getForecastHistory: (entityType: string, entityId: string) =>
    apiGet<CashFlowForecast[]>(`/v1/intelligence/cashflow/${entityType}/${entityId}`),

  approveForecast: (forecastId: number) =>
    apiPost<CashFlowForecast>(`/v1/intelligence/cashflow/${forecastId}/approve`),

  // Document Intelligence
  getPendingDocuments: () =>
    apiGet<DocumentJob[]>('/v1/intelligence/documents/pending-review'),

  submitDocument: (payload: { file?: File; documentRef?: string; documentType: string }) => {
    if (payload.file) {
      const form = new FormData();
      form.append('file', payload.file);
      form.append('documentType', payload.documentType);
      return api.post<{ data: DocumentJob }>('/api/v1/intelligence/documents/process', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data.data);
    }
    return apiPost<DocumentJob>('/v1/intelligence/documents/process', {
      documentRef: payload.documentRef,
      documentType: payload.documentType,
    });
  },

  reviewDocument: (jobId: string, action: 'APPROVE' | 'REJECT', notes?: string) =>
    apiPost<DocumentJob>(`/v1/intelligence/documents/${jobId}/review`, { action, notes }),
};
