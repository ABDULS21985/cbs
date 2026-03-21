import { apiGet } from '@/lib/api';
import type { ProductPerformanceSnapshot } from '../types/productAnalytics';

export const productAnalyticsApi = {
  /** GET /v1/product-analytics/product/{code} */
  getByProduct: (code: string, periodType: string = 'MONTHLY') =>
    apiGet<ProductPerformanceSnapshot[]>(`/api/v1/product-analytics/product/${code}`, {
      periodType,
    }),

  /** GET /v1/product-analytics/family/{family} */
  getByFamily: (family: string, periodType: string = 'MONTHLY', periodDate: string = new Date().toISOString().slice(0, 10)) =>
    apiGet<ProductPerformanceSnapshot[]>(`/api/v1/product-analytics/family/${family}`, {
      periodType,
      periodDate,
    }),

};
