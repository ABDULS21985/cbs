import { apiGet } from '@/lib/api';
import type { ServiceDirectoryEntry } from '../types/serviceDirectory';

export const serviceDirectoryApi = {
  /** GET /v1/service-directory/category/{category} */
  create: (category: string) =>
    apiGet<ServiceDirectoryEntry>(`/api/v1/service-directory/category/${category}`),

};
