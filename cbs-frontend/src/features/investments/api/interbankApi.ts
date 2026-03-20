import { apiGet, apiPost } from '@/lib/api';
import type { InterbankRelationship } from '../types/interbank';

export const interbankRelationshipsApi = {
  /** GET /v1/interbank-relationships */
  getAll: () =>
    apiGet<InterbankRelationship[]>('/api/v1/interbank-relationships').catch(() => []),

  /** GET /v1/interbank-relationships/type/{type} */
  byType: (type: string) =>
    apiGet<InterbankRelationship[]>(`/api/v1/interbank-relationships/type/${type}`),

  /** POST /v1/interbank-relationships */
  create: (data: Partial<InterbankRelationship>) =>
    apiPost<InterbankRelationship>('/api/v1/interbank-relationships', data),
};
