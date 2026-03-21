import { apiGet, apiPost } from '@/lib/api';
import type { PfmSnapshot } from '../types/pfm';

export const pfmApi = {
  /** POST /v1/pfm/snapshot/{customerId}?snapshotType=MONTHLY */
  generate: (customerId: number, snapshotType: string = 'MONTHLY') =>
    apiPost<PfmSnapshot>(`/api/v1/pfm/snapshot/${customerId}?snapshotType=${encodeURIComponent(snapshotType)}`),

  /** GET /v1/pfm/customer/{customerId} */
  history: (customerId: number) =>
    apiGet<PfmSnapshot[]>(`/api/v1/pfm/customer/${customerId}`),

  /** GET /v1/pfm/customer/{customerId}/latest */
  latest: (customerId: number) =>
    apiGet<PfmSnapshot[]>(`/api/v1/pfm/customer/${customerId}/latest`),

};
