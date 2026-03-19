import { apiGet } from '@/lib/api';
import type { LocationReference } from '../types/location';

export const locationsApi = {
  /** GET /v1/locations/type/{type} */
  byType: (type: string) =>
    apiGet<LocationReference[]>(`/api/v1/locations/type/${type}`),

  /** GET /v1/locations/{parentId}/children */
  children: (parentId: number) =>
    apiGet<LocationReference[]>(`/api/v1/locations/${parentId}/children`),

};
