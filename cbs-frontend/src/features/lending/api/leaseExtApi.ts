import { apiPost } from '@/lib/api';
import type { LeaseContract } from '../types/leaseExt';

export const leasesApi = {
  /** POST /v1/leases/{number}/activate */
  activate: (number: string) =>
    apiPost<LeaseContract>(`/api/v1/leases/${number}/activate`),

  /** POST /v1/leases/{number}/depreciate */
  depreciate: (number: string) =>
    apiPost<LeaseContract>(`/api/v1/leases/${number}/depreciate`),

  /** POST /v1/leases/{number}/purchase-option */
  buyout: (number: string) =>
    apiPost<LeaseContract>(`/api/v1/leases/${number}/purchase-option`),

  /** POST /v1/leases/{number}/early-terminate */
  terminate: (number: string) =>
    apiPost<LeaseContract>(`/api/v1/leases/${number}/early-terminate`),

};
