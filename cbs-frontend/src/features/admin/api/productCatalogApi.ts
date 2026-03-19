import { apiGet, apiPost } from '@/lib/api';
import type { ProductCatalogEntry } from '../types/productCatalog';

export const productCatalogApi = {
  /** POST /v1/product-catalog/{code}/launch */
  launch: (code: string) =>
    apiPost<ProductCatalogEntry>(`/api/v1/product-catalog/${code}/launch`),

  /** GET /v1/product-catalog/family/{family} */
  byFamily: (family: string) =>
    apiGet<ProductCatalogEntry[]>(`/api/v1/product-catalog/family/${family}`),

  /** GET /v1/product-catalog/sharia-compliant */
  sharia: (params?: Record<string, unknown>) =>
    apiGet<ProductCatalogEntry[]>('/api/v1/product-catalog/sharia-compliant', params),

};
