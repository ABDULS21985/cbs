import { apiGet } from '@/lib/api';
import type { AcquiringFacility, MerchantSettlement } from '../types/acquiringExt';

export const acquiringApi = {
  /** GET /v1/acquiring/facilities */
  listFacilities: (params?: Record<string, unknown>) =>
    apiGet<AcquiringFacility[]>('/api/v1/acquiring/facilities', params),

  /** GET /v1/acquiring/settlements/process */
  listSettlements: (params?: Record<string, unknown>) =>
    apiGet<MerchantSettlement[]>('/api/v1/acquiring/settlements/process', params),

};
