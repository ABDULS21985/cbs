import { apiGet, apiPost } from '@/lib/api';
import type { MarketplaceApiProduct, MarketplaceSubscription, MarketplaceUsageLog } from '../types/marketplace';

export const marketplaceApi = {
  /** POST /v1/marketplace/products */
  createProduct: (data: Partial<MarketplaceApiProduct>) =>
    apiPost<MarketplaceApiProduct>('/api/v1/marketplace/products', data),

  /** POST /v1/marketplace/products/{id}/publish */
  publish: (id: number) =>
    apiPost<MarketplaceApiProduct>(`/api/v1/marketplace/products/${id}/publish`),

  /** POST /v1/marketplace/products/{id}/deprecate */
  deprecate: (id: number) =>
    apiPost<MarketplaceApiProduct>(`/api/v1/marketplace/products/${id}/deprecate`),

  /** GET /v1/marketplace/products */
  getPublished: (params?: Record<string, unknown>) =>
    apiGet<MarketplaceApiProduct[]>('/api/v1/marketplace/products', params),

  /** GET /v1/marketplace/products/category/{category} */
  getByCategory: (category: string) =>
    apiGet<MarketplaceApiProduct[]>(`/api/v1/marketplace/products/category/${category}`),

  /** GET /v1/marketplace/subscriptions — list all subscriptions */
  getSubscriptions: () =>
    apiGet<MarketplaceSubscription[]>('/api/v1/marketplace/subscriptions'),

  /** POST /v1/marketplace/subscriptions — uses @RequestParam */
  subscribe: (data: { productId: number; subscriberName: string; subscriberEmail?: string; planTier?: string }) => {
    const p = new URLSearchParams();
    p.set('productId', String(data.productId));
    p.set('subscriberName', data.subscriberName);
    if (data.subscriberEmail) p.set('subscriberEmail', data.subscriberEmail);
    if (data.planTier) p.set('planTier', data.planTier);
    return apiPost<MarketplaceSubscription>(`/api/v1/marketplace/subscriptions?${p.toString()}`);
  },

  /** POST /v1/marketplace/subscriptions/{subscriptionId}/approve — subscriptionId is String */
  approve: (subscriptionId: string) =>
    apiPost<MarketplaceSubscription>(`/api/v1/marketplace/subscriptions/${subscriptionId}/approve`),

  /** GET /v1/marketplace/usage — list all usage logs */
  getUsageLogs: () =>
    apiGet<MarketplaceUsageLog[]>('/api/v1/marketplace/usage'),

  /** POST /v1/marketplace/usage */
  recordUsage: () =>
    apiPost<MarketplaceUsageLog>('/api/v1/marketplace/usage'),

  /** GET /v1/marketplace/products/{id}/analytics */
  getAnalytics: (id: number) =>
    apiGet<Record<string, unknown>>(`/api/v1/marketplace/products/${id}/analytics`),
};
