import { apiGet, apiPost } from '@/lib/api';
import type { PromotionalEvent } from '../types/promotion';

export const promotionsApi = {
  /** POST /v1/promotions/{code}/activate */
  create: (code: string, data: Partial<PromotionalEvent>) =>
    apiPost<PromotionalEvent>(`/api/v1/promotions/${code}/activate`, data),

  /** POST /v1/promotions/{code}/redeem */
  redeem: (code: string) =>
    apiPost<PromotionalEvent>(`/api/v1/promotions/${code}/redeem`),

  /** GET /v1/promotions/active */
  redeem2: (params?: Record<string, unknown>) =>
    apiGet<PromotionalEvent>('/api/v1/promotions/active', params),

  /** GET /v1/promotions/type/{type} */
  getByType: (type: string) =>
    apiGet<PromotionalEvent[]>(`/api/v1/promotions/type/${type}`),

};
