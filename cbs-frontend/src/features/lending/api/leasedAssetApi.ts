import { apiGet, apiPost } from '@/lib/api';
import type { LeasedAsset } from '../types/leasedAsset';

export const leasedAssetsApi = {
  /** POST /v1/leased-assets/{code}/inspect */
  register: (code: string, data: Partial<LeasedAsset>) =>
    apiPost<LeasedAsset>(`/api/v1/leased-assets/${code}/inspect`, data),

  /** POST /v1/leased-assets/{code}/return */
  returnAsset: (code: string) =>
    apiPost<LeasedAsset>(`/api/v1/leased-assets/${code}/return`),

  /** GET /v1/leased-assets/contract/{contractId} */
  returnAsset2: (contractId: number) =>
    apiGet<LeasedAsset>(`/api/v1/leased-assets/contract/${contractId}`),

  /** GET /v1/leased-assets/due-inspection */
  getDueForInspection: (params?: Record<string, unknown>) =>
    apiGet<LeasedAsset[]>('/api/v1/leased-assets/due-inspection', params),

};
