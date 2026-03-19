import { apiGet, apiPost } from '@/lib/api';
import type { SyndicateArrangement } from '../types/syndicate';

export const syndicatesApi = {
  /** POST /v1/syndicates/{code}/activate */
  activate: (code: string) =>
    apiPost<SyndicateArrangement>(`/api/v1/syndicates/${code}/activate`),

  /** GET /v1/syndicates/type/{type} */
  byType: (type: string) =>
    apiGet<SyndicateArrangement[]>(`/api/v1/syndicates/type/${type}`),

  /** GET /v1/syndicates/active */
  active: (params?: Record<string, unknown>) =>
    apiGet<SyndicateArrangement[]>('/api/v1/syndicates/active', params),

};
