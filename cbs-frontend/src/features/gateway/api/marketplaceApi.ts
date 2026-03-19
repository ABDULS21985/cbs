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

  /** POST /v1/marketplace/subscriptions */
  subscribe: () =>
    apiPost<MarketplaceSubscription>('/api/v1/marketplace/subscriptions'),

  /** POST /v1/marketplace/subscriptions/{subscriptionId}/approve */
  approve: (subscriptionId: number) =>
    apiPost<MarketplaceSubscription>(`/api/v1/marketplace/subscriptions/${subscriptionId}/approve`),

  /** POST /v1/marketplace/usage */
  recordUsage: () =>
    apiPost<MarketplaceUsageLog>('/api/v1/marketplace/usage'),

  /** GET /v1/marketplace/products/{id}/analytics */
  getAnalytics: (id: number) =>
    apiGet<Record<string, unknown>>(`/api/v1/marketplace/products/${id}/analytics`),

};
