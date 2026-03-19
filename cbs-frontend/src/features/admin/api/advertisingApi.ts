import { apiGet, apiPost } from '@/lib/api';
import type { AdPlacement } from '../types/advertising';

export const advertisingApi = {
  /** POST /v1/advertising/{code}/go-live */
  create: (code: string, data: Partial<AdPlacement>) =>
    apiPost<AdPlacement>(`/api/v1/advertising/${code}/go-live`, data),

  /** POST /v1/advertising/{code}/performance */
  recordPerformance: (code: string) =>
    apiPost<AdPlacement>(`/api/v1/advertising/${code}/performance`),

  /** GET /v1/advertising/status/{status} */
  recordPerformance2: (status: string) =>
    apiGet<AdPlacement>(`/api/v1/advertising/status/${status}`),

  /** GET /v1/advertising/media/{type} */
  getByMediaType: (type: string) =>
    apiGet<AdPlacement[]>(`/api/v1/advertising/media/${type}`),

};
