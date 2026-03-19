import { apiGet, apiPost } from '@/lib/api';
import type { ProductDeployment } from '../types/productDeploy';

export const productDeploymentsApi = {
  /** POST /v1/product-deployments/{code}/approve */
  create: (code: string, data: Partial<ProductDeployment>) =>
    apiPost<ProductDeployment>(`/api/v1/product-deployments/${code}/approve`, data),

  /** POST /v1/product-deployments/{code}/complete */
  complete: (code: string) =>
    apiPost<ProductDeployment>(`/api/v1/product-deployments/${code}/complete`),

  /** POST /v1/product-deployments/{code}/rollback */
  complete2: (code: string) =>
    apiPost<ProductDeployment>(`/api/v1/product-deployments/${code}/rollback`),

  /** GET /v1/product-deployments/product/{productCode} */
  getByProduct: (productCode: string) =>
    apiGet<ProductDeployment[]>(`/api/v1/product-deployments/product/${productCode}`),

};
