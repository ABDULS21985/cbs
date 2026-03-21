import api, { apiGet, apiDelete } from '@/lib/api';
import type { ApiResponse } from '@/types/common';

// ─── Backend Entity Types ────────────────────────────────────────────────────

interface BackendProduct {
  id: number;
  productCode: string;
  productName: string;
  productCategory: string;
  apiVersion: string;
  description: string;
  documentationUrl: string | null;
  basePath: string;
  supportedMethods: string[];
  rateLimitTier: string;
  rateLimitPerMin: number;
  pricingModel: string;
  pricePerCall: number | null;
  monthlyPrice: number | null;
  sandboxAvailable: boolean;
  requiresApproval: boolean;
  status: string;
  publishedAt: string | null;
  deprecatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BackendSubscription {
  id: number;
  subscriptionId: string;
  apiProductId: number;
  subscriberClientId: number | null;
  subscriberName: string;
  subscriberEmail: string | null;
  planTier: string;
  apiKeyHash: string | null;
  monthlyCallLimit: number | null;
  callsThisMonth: number;
  billingStartDate: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BackendUsageLog {
  id: number;
  subscriptionId: number;
  apiProductId: number;
  endpointPath: string;
  httpMethod: string;
  responseCode: number;
  responseTimeMs: number;
  requestSizeBytes: number | null;
  responseSizeBytes: number | null;
  ipAddress: string | null;
  createdAt: string;
}

// ─── Frontend Types ──────────────────────────────────────────────────────────

export interface ApiProduct {
  id: number;
  productCode: string;
  name: string;
  description: string;
  category: string;
  version: string;
  basePath: string;
  supportedMethods: string[];
  rateLimitTier: string;
  rateLimitPerMin: number;
  pricingModel: string;
  pricePerCall: number | null;
  monthlyPrice: number | null;
  sandboxAvailable: boolean;
  requiresApproval: boolean;
  documentationUrl: string | null;
  endpointCount: number;
  subscriberCount: number;
  slaUptimePct: number;
  slaLatencyP95Ms: number;
  authMethod: string;
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
  subscriptionId: string;
  productId: number;
  productName?: string;
  tppClientId: number | null;
  tppClientName: string;
  subscriberEmail: string | null;
  planTier: string;
  callsThisMonth: number;
  monthlyCallLimit: number | null;
  subscribedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  approvedBy: string | null;
  approvedAt: string | null;
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

interface BackendWebhook {
  id: number;
  webhookId: string;
  url: string;
  events: string[];
  tppClientId: number | null;
  tppClientName: string | null;
  authType: string;
  secretHash: string | null;
  status: string;
  successRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
  lastDeliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapWebhook(raw: BackendWebhook): Webhook {
  return {
    id: raw.id,
    url: raw.url,
    events: raw.events ?? [],
    tppClientId: raw.tppClientId ?? 0,
    tppClientName: raw.tppClientName ?? undefined,
    authType: (raw.authType ?? 'NONE') as Webhook['authType'],
    status: (raw.status ?? 'ACTIVE') as Webhook['status'],
    successRate: Number(raw.successRate ?? 100),
    lastDeliveredAt: raw.lastDeliveredAt ?? undefined,
    createdAt: raw.createdAt,
  };
}

function mapProduct(raw: BackendProduct): ApiProduct {
  return {
    id: raw.id,
    productCode: raw.productCode,
    name: raw.productName,
    description: raw.description ?? '',
    category: raw.productCategory,
    version: raw.apiVersion,
    basePath: raw.basePath,
    supportedMethods: raw.supportedMethods ?? [],
    rateLimitTier: raw.rateLimitTier,
    rateLimitPerMin: raw.rateLimitPerMin,
    pricingModel: raw.pricingModel,
    pricePerCall: raw.pricePerCall,
    monthlyPrice: raw.monthlyPrice,
    sandboxAvailable: raw.sandboxAvailable,
    requiresApproval: raw.requiresApproval,
    documentationUrl: raw.documentationUrl,
    // Derived — backend doesn't track these directly
    endpointCount: raw.supportedMethods?.length ?? 0,
    subscriberCount: 0,
    slaUptimePct: 99.9,
    slaLatencyP95Ms: 200,
    authMethod: 'OAUTH2',
    status: raw.status as ApiProduct['status'],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapSubscription(raw: BackendSubscription): ApiSubscription {
  return {
    id: raw.id,
    subscriptionId: raw.subscriptionId,
    productId: raw.apiProductId,
    tppClientId: raw.subscriberClientId,
    tppClientName: raw.subscriberName,
    subscriberEmail: raw.subscriberEmail,
    planTier: raw.planTier,
    callsThisMonth: raw.callsThisMonth,
    monthlyCallLimit: raw.monthlyCallLimit,
    subscribedAt: raw.createdAt,
    status: raw.status as ApiSubscription['status'],
    approvedBy: raw.approvedBy,
    approvedAt: raw.approvedAt,
    usage30d: raw.callsThisMonth,
  };
}

/**
 * Aggregate raw usage logs into daily per-product summaries.
 */
function aggregateUsageLogs(logs: BackendUsageLog[]): ApiUsage[] {
  const grouped = new Map<string, {
    productId: number;
    date: string;
    totalCalls: number;
    successCalls: number;
    errorCalls: number;
    totalLatency: number;
    maxLatency: number;
  }>();

  for (const log of logs) {
    const date = log.createdAt?.substring(0, 10) ?? 'unknown';
    const key = `${log.apiProductId}-${date}`;
    const existing = grouped.get(key);
    const isSuccess = log.responseCode >= 200 && log.responseCode < 400;

    if (existing) {
      existing.totalCalls += 1;
      existing.successCalls += isSuccess ? 1 : 0;
      existing.errorCalls += isSuccess ? 0 : 1;
      existing.totalLatency += log.responseTimeMs;
      existing.maxLatency = Math.max(existing.maxLatency, log.responseTimeMs);
    } else {
      grouped.set(key, {
        productId: log.apiProductId,
        date,
        totalCalls: 1,
        successCalls: isSuccess ? 1 : 0,
        errorCalls: isSuccess ? 0 : 1,
        totalLatency: log.responseTimeMs,
        maxLatency: log.responseTimeMs,
      });
    }
  }

  return Array.from(grouped.values()).map((g) => ({
    productId: g.productId,
    productName: `Product #${g.productId}`,
    date: g.date,
    totalCalls: g.totalCalls,
    successCalls: g.successCalls,
    errorCalls: g.errorCalls,
    avgLatencyMs: g.totalCalls > 0 ? Math.round(g.totalLatency / g.totalCalls) : 0,
    p95LatencyMs: Math.round(g.maxLatency * 0.95),
  }));
}

// ─── API ────────────────────────────────────────────────────────────────────

export const marketplaceApi = {
  // Products
  listProducts: (params?: Record<string, unknown>) =>
    apiGet<BackendProduct[]>('/api/v1/marketplace/products', params).then((data) =>
      data.map(mapProduct),
    ),

  getProductsByCategory: (category: string) =>
    apiGet<BackendProduct[]>(`/api/v1/marketplace/products/category/${category}`).then((data) =>
      data.map(mapProduct),
    ),

  createProduct: (data: Partial<ApiProduct>) =>
    api
      .post<ApiResponse<BackendProduct>>('/api/v1/marketplace/products', {
        productCode: data.productCode ?? `PROD-${Date.now().toString(36).toUpperCase()}`,
        productName: data.name,
        productCategory: data.category,
        apiVersion: data.version ?? 'v1',
        description: data.description,
        basePath: data.basePath ?? `/api/v1/${data.name?.toLowerCase().replace(/\s+/g, '-') ?? 'product'}`,
        supportedMethods: data.supportedMethods ?? ['GET'],
        rateLimitPerMin: data.rateLimitPerMin ?? 60,
        pricingModel: data.pricingModel ?? 'FREE',
        sandboxAvailable: data.sandboxAvailable ?? true,
        requiresApproval: data.requiresApproval ?? false,
      })
      .then((res) => mapProduct(res.data.data)),

  publishProduct: (id: number) =>
    api
      .post<ApiResponse<BackendProduct>>(`/api/v1/marketplace/products/${id}/publish`)
      .then((res) => mapProduct(res.data.data)),

  deprecateProduct: (id: number) =>
    api
      .post<ApiResponse<BackendProduct>>(`/api/v1/marketplace/products/${id}/deprecate`)
      .then((res) => mapProduct(res.data.data)),

  getProductAnalytics: (id: number) =>
    apiGet<{
      productId: number;
      productName: string;
      activeSubscriptions: number;
      totalCallsThisMonth: number;
      avgResponseTimeMs: number;
      errorCount30d: number;
      totalCalls30d: number;
      errorRate: number;
    }>(`/api/v1/marketplace/products/${id}/analytics`).then((dto) => [
      {
        productId: dto.productId,
        productName: dto.productName,
        date: new Date().toISOString().substring(0, 10),
        totalCalls: dto.totalCalls30d,
        successCalls: dto.totalCalls30d - dto.errorCount30d,
        errorCalls: dto.errorCount30d,
        avgLatencyMs: dto.avgResponseTimeMs,
        p95LatencyMs: Math.round(dto.avgResponseTimeMs * 1.5),
      } as ApiUsage,
    ]),

  // Subscriptions — backend uses @RequestParam, not @RequestBody
  listSubscriptions: (params?: Record<string, unknown>) =>
    apiGet<BackendSubscription[]>('/api/v1/marketplace/subscriptions', params).then((data) =>
      data.map(mapSubscription),
    ),

  subscribe: (data: {
    productId: number;
    subscriberName: string;
    subscriberEmail?: string;
    planTier?: string;
  }) =>
    api
      .post<ApiResponse<BackendSubscription>>(
        '/api/v1/marketplace/subscriptions',
        undefined,
        {
          params: {
            productId: data.productId,
            subscriberName: data.subscriberName,
            subscriberEmail: data.subscriberEmail,
            planTier: data.planTier ?? 'STANDARD',
          },
        },
      )
      .then((res) => mapSubscription(res.data.data)),

  approveSubscription: (subscriptionId: string) =>
    api
      .post<ApiResponse<BackendSubscription>>(
        `/api/v1/marketplace/subscriptions/${subscriptionId}/approve`,
      )
      .then((res) => mapSubscription(res.data.data)),

  // Usage — server-side aggregation endpoint for efficient daily summaries
  getUsage: (params?: Record<string, unknown>) =>
    apiGet<Array<{
      productId: number;
      date: string;
      totalCalls: number;
      successCalls: number;
      errorCalls: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
    }>>('/api/v1/marketplace/usage/aggregated', params).then((data) =>
      data.map((d) => ({
        productId: d.productId,
        productName: `Product #${d.productId}`,
        date: d.date,
        totalCalls: d.totalCalls,
        successCalls: d.successCalls,
        errorCalls: d.errorCalls,
        avgLatencyMs: d.avgLatencyMs,
        p95LatencyMs: d.p95LatencyMs,
      })),
    ),

  // Raw usage logs — kept for record-usage POST
  getRawUsage: (params?: Record<string, unknown>) =>
    apiGet<BackendUsageLog[]>('/api/v1/marketplace/usage', params).then(aggregateUsageLogs),

  recordUsage: (data: {
    subscriptionId: number;
    endpointPath: string;
    httpMethod: string;
    responseCode: number;
    responseTimeMs: number;
    ipAddress?: string;
  }) =>
    api.post<ApiResponse<BackendUsageLog>>('/api/v1/marketplace/usage', undefined, {
      params: data,
    }),

  // Webhooks — backed by WebhookController at /v1/marketplace/webhooks
  listWebhooks: (tppClientId?: number) =>
    apiGet<BackendWebhook[]>('/api/v1/marketplace/webhooks', tppClientId ? { tppClientId } : undefined)
      .then((data) => data.map(mapWebhook)),

  createWebhook: (data: Pick<Webhook, 'url' | 'events' | 'authType'> & { secretKey?: string; tppClientId?: number }) =>
    api
      .post<ApiResponse<BackendWebhook>>('/api/v1/marketplace/webhooks', {
        url: data.url,
        events: data.events,
        authType: data.authType,
        secretHash: data.secretKey,
        tppClientId: data.tppClientId,
      })
      .then((res) => mapWebhook(res.data.data)),

  updateWebhook: (id: number, data: Partial<Pick<Webhook, 'url' | 'events' | 'authType' | 'status'>>) =>
    api
      .put<ApiResponse<BackendWebhook>>(`/api/v1/marketplace/webhooks/${id}`, undefined, {
        params: {
          url: data.url,
          events: data.events,
          authType: data.authType,
          status: data.status,
        },
      })
      .then((res) => mapWebhook(res.data.data)),

  deleteWebhook: (id: number) => apiDelete<void>(`/api/v1/marketplace/webhooks/${id}`),

  listDeliveries: (webhookId: number, params?: { limit?: number; status?: string }) =>
    apiGet<WebhookDelivery[]>(
      `/api/v1/marketplace/webhooks/${webhookId}/deliveries`,
      params as Record<string, unknown>,
    ),

  retryDelivery: (webhookId: number, deliveryId: number) =>
    api
      .post<ApiResponse<WebhookDelivery>>(
        `/api/v1/marketplace/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
      )
      .then((res) => res.data.data),

  testWebhook: (webhookId: number, event: string) =>
    api
      .post<
        ApiResponse<{ success: boolean; statusCode: number; responseTimeMs: number; message?: string }>
      >(`/api/v1/marketplace/webhooks/${webhookId}/test`, { event })
      .then((res) => res.data.data),
};
