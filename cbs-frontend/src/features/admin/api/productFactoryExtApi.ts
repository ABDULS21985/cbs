import { apiGet, apiPost } from '@/lib/api';
import type { ProductTemplate } from '../types/productFactory';

export const productFactoryApi = {
  /** POST /v1/product-factory/templates */
  create: (data: Partial<ProductTemplate>) =>
    apiPost<ProductTemplate>('/api/v1/product-factory/templates', data),

  /** POST /v1/product-factory/templates/{id}/submit */
  submit: (id: number) =>
    apiPost<ProductTemplate>(`/api/v1/product-factory/templates/${id}/submit`),

  /** POST /v1/product-factory/templates/{id}/approve */
  approve: (id: number) =>
    apiPost<ProductTemplate>(`/api/v1/product-factory/templates/${id}/approve`),

  /** POST /v1/product-factory/templates/{id}/activate */
  activate: (id: number) =>
    apiPost<ProductTemplate>(`/api/v1/product-factory/templates/${id}/activate`),

  /** GET /v1/product-factory/templates/active */
  getActive: (params?: Record<string, unknown>) =>
    apiGet<ProductTemplate[]>('/api/v1/product-factory/templates/active', params),

  /** GET /v1/product-factory/templates/category/{category} */
  getByCategory: (category: string) =>
    apiGet<ProductTemplate[]>(`/api/v1/product-factory/templates/category/${category}`),

};
