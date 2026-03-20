import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceApi } from '../api/marketplaceApi';
import type { ApiProduct } from '../api/marketplaceApi';

const QK = {
  products: ['marketplace', 'products'] as const,
  productsByCategory: (cat: string) => ['marketplace', 'products', 'category', cat] as const,
  productAnalytics: (id: number) => ['marketplace', 'products', id, 'analytics'] as const,
  subscriptions: ['marketplace', 'subscriptions'] as const,
  usage: ['marketplace', 'usage'] as const,
};

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
    mutationFn: (data: Partial<ApiProduct>) => marketplaceApi.createProduct(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.products }); },
  });
}

export function usePublishProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.publishProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.products }); },
  });
}

export function useDeprecateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.deprecateProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.products }); },
  });
}

export function useApiSubscriptions(params?: Record<string, unknown>) {
  return useQuery({ queryKey: [...QK.subscriptions, params], queryFn: () => marketplaceApi.listSubscriptions(params), staleTime: 30_000 });
}

export function useSubscribeToApi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: number; tppClientId: number }) => marketplaceApi.subscribe(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.subscriptions }); },
  });
}

export function useApproveSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => marketplaceApi.approveSubscription(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.subscriptions }); },
  });
}

export function useApiUsage(params?: Record<string, unknown>) {
  return useQuery({ queryKey: [...QK.usage, params], queryFn: () => marketplaceApi.getUsage(params), staleTime: 30_000 });
}
