import { apiGet, apiPost } from '@/lib/api';
import type { Tenant } from '../types/tenant';

export const tenantsApi = {
  /** GET /v1/tenants/{tenantCode} */
  get: (tenantCode: string) =>
    apiGet<Tenant>(`/api/v1/tenants/${tenantCode}`),

  /** POST /v1/tenants/{tenantCode}/deactivate */
  deactivate: (tenantCode: string) =>
    apiPost<Tenant>(`/api/v1/tenants/${tenantCode}/deactivate`),

};
