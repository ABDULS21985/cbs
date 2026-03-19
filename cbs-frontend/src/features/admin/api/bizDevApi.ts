import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { BizDevInitiative } from '../types/bizDev';

export const bizDevApi = {
  /** POST /v1/biz-dev/{code}/approve */
  create: (code: string, data: Partial<BizDevInitiative>) =>
    apiPost<BizDevInitiative>(`/api/v1/biz-dev/${code}/approve`, data),

  /** PATCH /v1/biz-dev/{code}/progress */
  updateProgress: (code: string) =>
    apiPatch<BizDevInitiative>(`/api/v1/biz-dev/${code}/progress`),

  /** POST /v1/biz-dev/{code}/complete */
  updateProgress2: (code: string) =>
    apiPost<BizDevInitiative>(`/api/v1/biz-dev/${code}/complete`),

  /** GET /v1/biz-dev/status/{status} */
  getByStatus: (status: string) =>
    apiGet<BizDevInitiative[]>(`/api/v1/biz-dev/status/${status}`),

};
