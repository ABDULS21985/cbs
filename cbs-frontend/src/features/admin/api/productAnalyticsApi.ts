import { apiGet } from '@/lib/api';
import type { ProductPerformanceSnapshot } from '../types/productAnalytics';

export const productAnalyticsApi = {
  /** GET /v1/product-analytics/product/{code} */
  getByProduct: (code: string) =>
    apiGet<ProductPerformanceSnapshot[]>(`/api/v1/product-analytics/product/${code}`),

  /** GET /v1/product-analytics/family/{family} */
  getByFamily: (family: string) =>
    apiGet<ProductPerformanceSnapshot[]>(`/api/v1/product-analytics/family/${family}`),

};
