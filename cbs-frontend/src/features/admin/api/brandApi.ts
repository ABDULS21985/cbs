import { apiGet, apiPost } from '@/lib/api';
import type { BrandGuideline } from '../types/brand';

export const brandGuidelinesApi = {
  /** POST /v1/brand-guidelines/{code}/activate */
  create: (code: string, data: Partial<BrandGuideline>) =>
    apiPost<BrandGuideline>(`/api/v1/brand-guidelines/${code}/activate`, data),

  /** GET /v1/brand-guidelines/type/{type} */
  getByType: (type: string) =>
    apiGet<BrandGuideline[]>(`/api/v1/brand-guidelines/type/${type}`),

  /** GET /v1/brand-guidelines/active */
  getByType2: (params?: Record<string, unknown>) =>
    apiGet<BrandGuideline[]>('/api/v1/brand-guidelines/active', params),

};
