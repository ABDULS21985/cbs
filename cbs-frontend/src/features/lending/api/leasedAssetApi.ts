import { apiGet, apiPost } from '@/lib/api';
import type { LeasedAsset } from '../types/leasedAsset';

export const leasedAssetsApi = {
  /** GET /v1/leased-assets */
  listAll: () =>
    apiGet<LeasedAsset[]>('/api/v1/leased-assets'),

  /** POST /v1/leased-assets */
  register: (data: Partial<LeasedAsset>) =>
    apiPost<LeasedAsset>('/api/v1/leased-assets', data),

  /** POST /v1/leased-assets/{code}/inspect */
  inspect: (code: string, data: { condition: string; nextInspectionDue?: string }) =>
    apiPost<LeasedAsset>(`/api/v1/leased-assets/${code}/inspect`, data),

  /** POST /v1/leased-assets/{code}/return */
  returnAsset: (code: string, returnCondition?: string) =>
    apiPost<LeasedAsset>(`/api/v1/leased-assets/${code}/return`, returnCondition ? { returnCondition } : undefined),

  /** GET /v1/leased-assets/contract/{contractId} */
  getByContract: (contractId: number) =>
    apiGet<LeasedAsset[]>(`/api/v1/leased-assets/contract/${contractId}`),

  /** GET /v1/leased-assets/due-inspection */
  getDueForInspection: () =>
    apiGet<LeasedAsset[]>('/api/v1/leased-assets/due-inspection'),
};
