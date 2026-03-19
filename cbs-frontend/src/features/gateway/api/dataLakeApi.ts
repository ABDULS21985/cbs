import { apiGet, apiPost } from '@/lib/api';
import type { DataExportJob } from '../types/dataLake';

export const dataLakeApi = {
  /** POST /v1/data-lake/jobs */
  createJob: (data: Partial<DataExportJob>) =>
    apiPost<DataExportJob>('/api/v1/data-lake/jobs', data),

  /** POST /v1/data-lake/jobs/{id}/execute */
  execute: (id: number) =>
    apiPost<DataExportJob>(`/api/v1/data-lake/jobs/${id}/execute`),

  /** GET /v1/data-lake/jobs */
  getActiveJobs: (params?: Record<string, unknown>) =>
    apiGet<DataExportJob[]>('/api/v1/data-lake/jobs', params),

  /** GET /v1/data-lake/jobs/entity/{entity} */
  getByEntity: (entity: string) =>
    apiGet<DataExportJob[]>(`/api/v1/data-lake/jobs/entity/${entity}`),

};
