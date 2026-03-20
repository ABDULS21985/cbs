import { apiGet, apiPost } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  version: string;
  endpointCount: number;
  subscriberCount: number;
  rateLimitPerMin: number;
  slaUptimePct: number;
  slaLatencyP95Ms: number;
  authMethod: 'OAUTH2' | 'API_KEY' | 'BOTH';
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';
  createdAt: string;
  updatedAt?: string;
  endpoints?: ApiEndpoint[];
  changelog?: string;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  authRequired: boolean;
  requestSchema?: string;
  responseSchema?: string;
  exampleRequest?: string;
  exampleResponse?: string;
}

export interface ApiSubscription {
  id: number;
  productId: number;
  productName?: string;
  tppClientId: number;
  tppClientName?: string;
  subscribedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  usage30d?: number;
}

export interface ApiUsage {
  productId: number;
  productName: string;
  date: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface Webhook {
  id: number;
  url: string;
  events: string[];
  tppClientId: number;
  tppClientName?: string;
  authType: 'NONE' | 'BASIC' | 'BEARER' | 'HMAC';
  secretKey?: string;
  status: 'ACTIVE' | 'DISABLED' | 'FAILED';
  successRate: number;
  lastDeliveredAt?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: number;
  webhookId: number;
  event: string;
  httpStatus: number;
  durationMs: number;
  responseBody?: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  attemptCount: number;
  deliveredAt: string;
}

// ─── API ────────────────────────────────────────────────────────────────────

export const marketplaceApi = {
  // Products
  listProducts: (params?: Record<string, unknown>) =>
    apiGet<ApiProduct[]>('/api/v1/marketplace/products', params),

  getProductsByCategory: (category: string) =>
    apiGet<ApiProduct[]>(`/api/v1/marketplace/products/category/${category}`),

  createProduct: (data: Partial<ApiProduct>) =>
    apiPost<ApiProduct>('/api/v1/marketplace/products', data),

  publishProduct: (id: number) =>
    apiPost<ApiProduct>(`/api/v1/marketplace/products/${id}/publish`),

  deprecateProduct: (id: number) =>
    apiPost<ApiProduct>(`/api/v1/marketplace/products/${id}/deprecate`),

  getProductAnalytics: (id: number) =>
    apiGet<ApiUsage[]>(`/api/v1/marketplace/products/${id}/analytics`),

  // Subscriptions
  listSubscriptions: (params?: Record<string, unknown>) =>
    apiGet<ApiSubscription[]>('/api/v1/marketplace/subscriptions', params),

  subscribe: (data: { productId: number; tppClientId: number }) =>
    apiPost<ApiSubscription>('/api/v1/marketplace/subscriptions', data),

  approveSubscription: (id: number) =>
    apiPost<ApiSubscription>(`/api/v1/marketplace/subscriptions/${id}/approve`),

  // Usage
  getUsage: (params?: Record<string, unknown>) =>
    apiGet<ApiUsage[]>('/api/v1/marketplace/usage', params),

  recordUsage: (data: Partial<ApiUsage>) =>
    apiPost<ApiUsage>('/api/v1/marketplace/usage', data),
};
