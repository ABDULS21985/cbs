import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { Biller, BillerCreateRequest } from '../types/biller';

export const billerAdminApi = {
  getAll: () =>
    apiGet<Biller[]>('/api/v1/admin/billers'),

  create: (data: BillerCreateRequest) =>
    apiPost<Biller>('/api/v1/admin/billers', data),

  update: (id: number, data: Partial<BillerCreateRequest>) =>
    apiPut<Biller>(`/api/v1/admin/billers/${id}`, data),
};
