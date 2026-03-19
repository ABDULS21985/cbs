import { apiGet, apiPost } from '@/lib/api';
import type { CustomerBundleEnrollment, ProductBundle } from '../types/productBundle';

export const productBundlesApi = {
  /** GET /v1/product-bundles/active */
  getActive: (params?: Record<string, unknown>) =>
    apiGet<ProductBundle[]>('/api/v1/product-bundles/active', params),

  /** POST /v1/product-bundles/{code}/enroll */
  enroll: (code: string, data: Record<string, unknown>) =>
    apiPost<CustomerBundleEnrollment>(`/api/v1/product-bundles/${code}/enroll`, data),

  /** GET /v1/product-bundles/customer/{customerId} */
  getEnrollments: (customerId: number) =>
    apiGet<CustomerBundleEnrollment[]>(`/api/v1/product-bundles/customer/${customerId}`),

};
