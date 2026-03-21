import { apiGet, apiPost } from '@/lib/api';
import type { BusinessRiskAssessment } from '../types/businessRisk';

export const businessRiskApi = {
  /** POST /v1/business-risk — Create a new assessment */
  create: (data: Partial<BusinessRiskAssessment>) =>
    apiPost<BusinessRiskAssessment>('/api/v1/business-risk', data),

  /** POST /v1/business-risk/{code}/complete — Complete an assessment */
  complete: (code: string) =>
    apiPost<BusinessRiskAssessment>(`/api/v1/business-risk/${code}/complete`),

  /** GET /v1/business-risk/domain/{domain} */
  getByDomain: (domain: string) =>
    apiGet<BusinessRiskAssessment[]>(`/api/v1/business-risk/domain/${domain}`),

  /** GET /v1/business-risk/rating/{rating} */
  getByRating: (rating: string) =>
    apiGet<BusinessRiskAssessment[]>(`/api/v1/business-risk/rating/${rating}`),
};
