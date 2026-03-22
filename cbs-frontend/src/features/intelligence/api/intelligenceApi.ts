import { apiGet } from '@/lib/api';
import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';

// ---- Types aligned to backend entities ----------------------------------------

export interface ProductRecommendation {
  id: number;
  customerId: number;
  recommendedProduct: string;
  recommendationType: 'CROSS_SELL' | 'UP_SELL' | 'RETENTION' | 'NEXT_BEST_ACTION' | 'LIFECYCLE' | 'REACTIVATION' | 'CAMPAIGN';
  score: number;
  reason: string;
  modelVersion: string;
  status: 'PENDING' | 'PRESENTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  presentedAt?: string;
  respondedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

/** Normalized churn score — the API normalizer handles both snake_case Map keys and camelCase */
export interface ChurnScoreResponse {
  customerId: number;
  churnScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  logins30d: number;
  transactions30d: number;
  complaints90d: number;
}

/**
 * Normalizes churn score response.
 * Backend service builds a Map<String,Object> with snake_case keys:
 *   customer_id, churn_score, risk_level, logins_30d, transactions_30d, complaints_90d
 * But if Jackson global naming strategy changes, keys could arrive as camelCase.
 * This normalizer handles both conventions.
 */
function normalizeChurnScore(raw: Record<string, unknown>): ChurnScoreResponse {
  return {
    customerId:      Number(raw.customer_id ?? raw.customerId ?? 0),
    churnScore:      Number(raw.churn_score ?? raw.churnScore ?? 0),
    riskLevel:       String(raw.risk_level ?? raw.riskLevel ?? 'LOW') as ChurnScoreResponse['riskLevel'],
    logins30d:       Number(raw.logins_30d ?? raw.logins30d ?? 0),
    transactions30d: Number(raw.transactions_30d ?? raw.transactions30d ?? 0),
    complaints90d:   Number(raw.complaints_90d ?? raw.complaints90d ?? 0),
  };
}

export interface DocumentProcessingJob {
  id: number;
  jobId: string;
  documentId: number;
  documentType: string;
  processingType: string;
  inputFormat: string;
  extractedData: Record<string, unknown> | null;
  confidenceScore: number | null;
  verificationStatus: 'PENDING' | 'PROCESSING' | 'EXTRACTED' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
  flags: string[] | null;
  processingTimeMs: number | null;
  modelUsed: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CashflowForecast {
  id: number;
  forecastId: string;
  entityType: string;
  entityId: string;
  forecastDate: string;
  horizonDays: number;
  currency: string;
  projectedInflows: number;
  projectedOutflows: number;
  netPosition: number;
  confidenceLevel: number;
  lowerBound: number | null;
  upperBound: number | null;
  modelType: string;
  modelVersion: string | null;
  featureImportance: Record<string, unknown> | null;
  inflowBreakdown: Record<string, unknown> | null;
  outflowBreakdown: Record<string, unknown> | null;
  status: 'GENERATING' | 'GENERATED' | 'APPROVED' | 'EXPIRED' | 'SUPERSEDED';
  createdAt: string;
}

export interface CustomerBehaviourEvent {
  id: number;
  customerId: number;
  eventType: 'LOGIN' | 'PAGE_VIEW' | 'PRODUCT_VIEW' | 'TRANSACTION' | 'SEARCH' | 'APPLICATION_START' | 'APPLICATION_COMPLETE' | 'SUPPORT_CONTACT' | 'COMPLAINT' | 'FEEDBACK' | 'OFFER_VIEW' | 'OFFER_ACCEPT' | 'OFFER_REJECT' | 'CHURN_SIGNAL';
  channel: string;
  sessionId: string | null;
  eventData: Record<string, unknown> | null;
  deviceType: string | null;
  geoLocation: string | null;
  createdAt: string;
}

export interface DashboardDefinition {
  id: number;
  dashboardCode: string;
  dashboardName: string;
  dashboardType: 'EXECUTIVE' | 'OPERATIONS' | 'RISK' | 'COMPLIANCE' | 'BRANCH' | 'PRODUCT' | 'CUSTOMER' | 'TREASURY' | 'IT' | 'CUSTOM';
  layoutConfig: Record<string, unknown> | null;
  refreshIntervalSec: number;
  allowedRoles: string[] | null;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface DashboardWidget {
  id: number;
  dashboardId: number;
  widgetCode: string;
  widgetType: 'KPI_CARD' | 'LINE_CHART' | 'BAR_CHART' | 'PIE_CHART' | 'TABLE' | 'HEATMAP' | 'MAP' | 'GAUGE' | 'FUNNEL' | 'TREEMAP' | 'SCATTER' | 'ALERT_FEED' | 'TICKER';
  title: string;
  dataSource: string;
  queryConfig: Record<string, unknown> | null;
  displayConfig: Record<string, unknown> | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  refreshOverrideSec: number | null;
  isActive: boolean;
  createdAt: string;
}

// ---- API client ---------------------------------------------------------------

export const intelligenceApi = {
  // ---- Behaviour: Events ----
  listEvents: () =>
    apiGet<CustomerBehaviourEvent[]>('/api/v1/intelligence/behaviour/events'),

  trackEvent: async (event: Partial<CustomerBehaviourEvent>) => {
    const { data } = await api.post<ApiResponse<CustomerBehaviourEvent>>(
      '/api/v1/intelligence/behaviour/events', event,
    );
    return data.data;
  },

  // ---- Behaviour: Recommendations ----
  getRecommendations: (customerId: number) =>
    apiGet<ProductRecommendation[]>(`/api/v1/intelligence/behaviour/recommendations/${customerId}`),

  generateRecommendations: async (customerId: number) => {
    const { data } = await api.post<ApiResponse<ProductRecommendation[]>>(
      `/api/v1/intelligence/behaviour/recommendations/${customerId}/generate`,
    );
    return data.data;
  },

  /** Backend: POST /{id}/respond?accepted=true|false */
  respondToRecommendation: async (id: number, accepted: boolean) => {
    const { data } = await api.post<ApiResponse<ProductRecommendation>>(
      `/api/v1/intelligence/behaviour/recommendations/${id}/respond`,
      null,
      { params: { accepted } },
    );
    return data.data;
  },

  // ---- Behaviour: Churn ----
  getChurnScore: async (customerId: number): Promise<ChurnScoreResponse> => {
    const raw = await apiGet<Record<string, unknown>>(`/api/v1/intelligence/behaviour/churn-score/${customerId}`);
    return normalizeChurnScore(raw);
  },

  // ---- Cash Flow Forecasting ----
  listForecasts: () =>
    apiGet<CashflowForecast[]>('/api/v1/intelligence/cashflow/forecast'),

  /** Backend: POST /forecast?entityType=X&entityId=Y&currency=Z&horizonDays=N&modelType=M */
  generateForecast: async (params: {
    entityType: string;
    entityId: string;
    currency?: string;
    horizonDays?: number;
    modelType?: string;
  }) => {
    const { data } = await api.post<ApiResponse<CashflowForecast>>(
      '/api/v1/intelligence/cashflow/forecast',
      null,
      { params },
    );
    return data.data;
  },

  getForecastHistory: (entityType: string, entityId: string) =>
    apiGet<CashflowForecast[]>(`/api/v1/intelligence/cashflow/${entityType}/${entityId}`),

  /** Backend: POST /{forecastId}/approve — forecastId is a String */
  approveForecast: async (forecastId: string) => {
    const { data } = await api.post<ApiResponse<CashflowForecast>>(
      `/api/v1/intelligence/cashflow/${forecastId}/approve`,
    );
    return data.data;
  },

  // ---- Document Intelligence ----
  listAllJobs: () =>
    apiGet<DocumentProcessingJob[]>('/api/v1/intelligence/documents/process'),

  getPendingDocuments: () =>
    apiGet<DocumentProcessingJob[]>('/api/v1/intelligence/documents/pending-review'),

  getOcrProviderStatus: () =>
    apiGet<{ available: boolean; providerName: string }>('/api/v1/intelligence/documents/provider-status'),

  submitDocument: async (job: Partial<DocumentProcessingJob>) => {
    const { data } = await api.post<ApiResponse<DocumentProcessingJob>>(
      '/api/v1/intelligence/documents/process', job,
    );
    return data.data;
  },

  /** Backend: POST /{jobId}/review?status=VERIFIED|FAILED */
  reviewDocument: async (jobId: string, status: string) => {
    const { data } = await api.post<ApiResponse<DocumentProcessingJob>>(
      `/api/v1/intelligence/documents/${jobId}/review`,
      null,
      { params: { status } },
    );
    return data.data;
  },

  // ---- Dashboards ----
  listAllDashboards: () =>
    apiGet<DashboardDefinition[]>('/api/v1/intelligence/dashboards'),

  getDashboardsByType: (type: string) =>
    apiGet<DashboardDefinition[]>(`/api/v1/intelligence/dashboards/type/${type}`),

  getDashboardWithWidgets: (code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/intelligence/dashboards/code/${code}`),

  createDashboard: async (dashboard: Partial<DashboardDefinition>) => {
    const { data } = await api.post<ApiResponse<DashboardDefinition>>(
      '/api/v1/intelligence/dashboards', dashboard,
    );
    return data.data;
  },

  addWidget: async (dashboardId: number, widget: Partial<DashboardWidget>) => {
    const { data } = await api.post<ApiResponse<DashboardWidget>>(
      `/api/v1/intelligence/dashboards/${dashboardId}/widgets`, widget,
    );
    return data.data;
  },
};
