import { apiGet } from '@/lib/api';
import type { InterbankRelationship } from '../types/interbank';

export const interbankRelationshipsApi = {
  /** GET /v1/interbank-relationships/type/{type} */
  byType: (type: string) =>
    apiGet<InterbankRelationship[]>(`/api/v1/interbank-relationships/type/${type}`),

};
