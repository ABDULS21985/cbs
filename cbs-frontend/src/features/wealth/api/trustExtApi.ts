import { apiGet } from '@/lib/api';
import type { TrustAccount } from '../types/trustExt';

export const trustsApi = {
  /** GET /v1/trusts/grantor/{grantorId} */
  getByGrantor: (grantorId: number) =>
    apiGet<TrustAccount[]>(`/api/v1/trusts/grantor/${grantorId}`),

  /** GET /v1/trusts/type/{type} */
  getByType: (type: string) =>
    apiGet<TrustAccount[]>(`/api/v1/trusts/type/${type}`),

};
