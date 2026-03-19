import { apiGet, apiPost } from '@/lib/api';
import type { ProductInventoryItem } from '../types/productInventory';

export const productInventoryApi = {
  /** POST /v1/product-inventory/{code}/issue */
  issue: (code: string) =>
    apiPost<ProductInventoryItem>(`/api/v1/product-inventory/${code}/issue`),

  /** POST /v1/product-inventory/{code}/replenish */
  replenish: (code: string) =>
    apiPost<ProductInventoryItem>(`/api/v1/product-inventory/${code}/replenish`),

  /** GET /v1/product-inventory/low-stock */
  getLowStock: (params?: Record<string, unknown>) =>
    apiGet<ProductInventoryItem[]>('/api/v1/product-inventory/low-stock', params),

  /** GET /v1/product-inventory/branch/{branchId} */
  getByBranch: (branchId: number) =>
    apiGet<ProductInventoryItem[]>(`/api/v1/product-inventory/branch/${branchId}`),

};
