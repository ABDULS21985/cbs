import { apiGet } from '@/lib/api';
import type { ProductQualityAssessment } from '../types/productQuality';

export const productQualityApi = {
  /** GET /v1/product-quality/trend/{productCode} */
  getQualityTrend: (productCode: string) =>
    apiGet<ProductQualityAssessment[]>(`/api/v1/product-quality/trend/${productCode}`),

  /** GET /v1/product-quality/dashboard */
  getQualityDashboard: (params?: Record<string, unknown>) =>
    apiGet<ProductQualityAssessment[]>('/api/v1/product-quality/dashboard', params),

  /** GET /v1/product-quality/compare */
  compareProducts: (params?: Record<string, unknown>) =>
    apiGet<ProductQualityAssessment[]>('/api/v1/product-quality/compare', params),

};
