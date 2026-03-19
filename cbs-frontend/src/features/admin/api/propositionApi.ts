import { apiGet, apiPost } from '@/lib/api';
import type { CustomerProposition } from '../types/proposition';

export const propositionsApi = {
  /** POST /v1/propositions/{code}/activate */
  activate: (code: string) =>
    apiPost<CustomerProposition>(`/api/v1/propositions/${code}/activate`),

  /** GET /v1/propositions/segment/{segment} */
  bySegment: (segment: string) =>
    apiGet<CustomerProposition[]>(`/api/v1/propositions/segment/${segment}`),

};
