import { apiPost } from '@/lib/api';
import type { DocumentaryCollection } from '../types/collectionsExt';

export const collectionsApi = {
  /** POST /collections/{id}/settle */
  settleCollection: (id: number) =>
    apiPost<DocumentaryCollection>(`/api/collections/${id}/settle`),

};
