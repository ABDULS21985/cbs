import { apiGet, apiPost } from '@/lib/api';
import type { BusinessRiskAssessment } from '../types/businessRisk';

export const businessRiskApi = {
  /** POST /v1/business-risk/{code}/complete */
  create: (code: string, data: Partial<BusinessRiskAssessment>) =>
    apiPost<BusinessRiskAssessment>(`/api/v1/business-risk/${code}/complete`, data),

  /** GET /v1/business-risk/domain/{domain} */
  getByDomain: (domain: string) =>
    apiGet<BusinessRiskAssessment[]>(`/api/v1/business-risk/domain/${domain}`),

  /** GET /v1/business-risk/rating/{rating} */
  getByDomain2: (rating: string) =>
    apiGet<BusinessRiskAssessment[]>(`/api/v1/business-risk/rating/${rating}`),

};
