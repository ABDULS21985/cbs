import { apiGet, apiPost } from '@/lib/api';
import type { PublicOfferingDetail } from '../types/publicOffering';

export const publicOfferingsApi = {
  /** GET /v1/public-offerings/deal/{dealId} */
  getByDeal: (dealId: number) =>
    apiGet<PublicOfferingDetail>(`/api/v1/public-offerings/deal/${dealId}`),

  /** POST /v1/public-offerings/{id}/submit-regulator */
  getByDeal2: (id: number) =>
    apiPost<PublicOfferingDetail>(`/api/v1/public-offerings/${id}/submit-regulator`),

  /** POST /v1/public-offerings/{id}/allotment */
  recordAllotment: (id: number) =>
    apiPost<PublicOfferingDetail>(`/api/v1/public-offerings/${id}/allotment`),

};
