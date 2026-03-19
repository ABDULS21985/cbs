import { apiPost, apiPut } from '@/lib/api';
import type { Branch } from '../types/branch';

export const branchesApi = {
  /** PUT /v1/branches/{id} */
  update: (id: number, data: Partial<Branch>) =>
    apiPut<Branch>(`/api/v1/branches/${id}`, data),

  /** POST /v1/branches/{id}/close */
  close: (id: number) =>
    apiPost<Branch>(`/api/v1/branches/${id}/close`),

};
