import { apiGet, apiPost } from '@/lib/api';
import type { AchBatch } from '../types/achExt';

export const achApi = {
  /** POST /v1/ach/batches */
  create: (data: Partial<AchBatch>) =>
    apiPost<AchBatch>('/api/v1/ach/batches', data),

  /** POST /v1/ach/batches/{id}/submit */
  create2: (id: number, data: Partial<AchBatch>) =>
    apiPost<AchBatch>(`/api/v1/ach/batches/${id}/submit`, data),

  /** POST /v1/ach/batches/{id}/settle */
  settle: (id: number) =>
    apiPost<AchBatch>(`/api/v1/ach/batches/${id}/settle`),

  /** GET /v1/ach/batches/{operator}/{status} */
  settle2: (operator: string, status: string) =>
    apiGet<AchBatch>(`/api/v1/ach/batches/${operator}/${status}`),

};
