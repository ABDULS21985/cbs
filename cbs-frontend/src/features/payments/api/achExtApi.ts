import { apiGet, apiPost } from '@/lib/api';
import type { AchBatch } from '../types/achExt';

export const achExtApi = {
  /** POST /v1/ach/batches — create a new ACH batch */
  createBatch: (data: Partial<AchBatch>) =>
    apiPost<AchBatch>('/api/v1/ach/batches', data),

  /** POST /v1/ach/batches/{id}/submit — submit batch for processing */
  submitBatch: (id: number) =>
    apiPost<AchBatch>(`/api/v1/ach/batches/${id}/submit`),

  /** POST /v1/ach/batches/{id}/settle — settle a batch */
  settleBatch: (id: number) =>
    apiPost<AchBatch>(`/api/v1/ach/batches/${id}/settle`),

  /** GET /v1/ach/batches/{operator}/{status} — get batches by operator and status */
  getBatchesByOperator: (operator: string, status: string) =>
    apiGet<AchBatch[]>(`/api/v1/ach/batches/${operator}/${status}`),

};
