import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../api/marketplaceApi';
import type { ApiProduct, Webhook } from '../api/marketplaceApi';

const QK = {
  products: ['marketplace', 'products'] as const,
  productsByCategory: (cat: string) => ['marketplace', 'products', 'category', cat] as const,
  productAnalytics: (id: number) => ['marketplace', 'products', id, 'analytics'] as const,
  subscriptions: ['marketplace', 'subscriptions'] as const,
  usage: ['marketplace', 'usage'] as const,
  webhooks: ['marketplace', 'webhooks'] as const,
  webhookDeliveries: (id: number) => ['marketplace', 'webhooks', id, 'deliveries'] as const,
};

// ─── Product Hooks ──────────────────────────────────────────────────────────

export function useApiProducts(params?: Record<string, unknown>) {
  return useQuery({ queryKey: [...QK.products, params], queryFn: () => marketplaceApi.listProducts(params), staleTime: 60_000 });
}

export function useApiProductsByCategory(category: string) {
  return useQuery({
    queryKey: QK.productsByCategory(category),
    queryFn: () => marketplaceApi.getProductsByCategory(category),
    enabled: !!category,
    staleTime: 60_000,
  });
}

export function useProductAnalytics(id: number) {
  return useQuery({
    queryKey: QK.productAnalytics(id),
    queryFn: () => marketplaceApi.getProductAnalytics(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useCreateApiProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ApiProduct>) => marketplaceApi.createProduct(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.products }); },
  });
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => marketplaceApi.publishProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.products }); },
  });
}

export function useDeprecateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => marketplaceApi.deprecateProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.products }); },
  });
}

// ─── Subscription Hooks ─────────────────────────────────────────────────────

export function useApiSubscriptions(params?: Record<string, unknown>) {
  return useQuery({ queryKey: [...QK.subscriptions, params], queryFn: () => marketplaceApi.listSubscriptions(params), staleTime: 30_000 });
}

export function useSubscribeToApi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productId: number; subscriberName: string; subscriberEmail?: string; planTier?: string }) =>
      marketplaceApi.subscribe(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.subscriptions }); },
  });
}

export function useApproveSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subscriptionId: string) => marketplaceApi.approveSubscription(subscriptionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.subscriptions }); },
  });
}

// ─── Usage Hooks ────────────────────────────────────────────────────────────

export function useApiUsage(params?: Record<string, unknown>) {
  return useQuery({ queryKey: [...QK.usage, params], queryFn: () => marketplaceApi.getUsage(params), staleTime: 30_000 });
}

// ─── Webhook Hooks ──────────────────────────────────────────────────────────

export function useWebhooks(tppClientId?: number) {
  return useQuery({
    queryKey: [...QK.webhooks, tppClientId],
    queryFn: () => marketplaceApi.listWebhooks(tppClientId),
    staleTime: 30_000,
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Pick<Webhook, 'url' | 'events' | 'authType'> & { secretKey?: string; tppClientId?: number }) =>
      marketplaceApi.createWebhook(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.webhooks }); },
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Pick<Webhook, 'url' | 'events' | 'authType' | 'status'>> }) =>
      marketplaceApi.updateWebhook(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.webhooks }); },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => marketplaceApi.deleteWebhook(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.webhooks }); },
  });
}

export function useWebhookDeliveries(webhookId: number) {
  return useQuery({
    queryKey: QK.webhookDeliveries(webhookId),
    queryFn: () => marketplaceApi.listDeliveries(webhookId),
    enabled: webhookId > 0,
    staleTime: 15_000,
  });
}

export function useRetryDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ webhookId, deliveryId }: { webhookId: number; deliveryId: number }) =>
      marketplaceApi.retryDelivery(webhookId, deliveryId),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: QK.webhookDeliveries(vars.webhookId) }); },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async ({ webhookId, event }: { webhookId: number; event: string }) =>
      marketplaceApi.testWebhook(webhookId, event),
  });
}
