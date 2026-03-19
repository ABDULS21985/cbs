import { apiGet, apiPost } from '@/lib/api';
import type { FtpAllocation, FtpRateCurve } from '../types/ftp';

export const ftpApi = {
  /** POST /v1/ftp/curves */
  addRatePoint: () =>
    apiPost<FtpRateCurve>('/api/v1/ftp/curves'),

  /** POST /v1/ftp/allocate */
  allocate: () =>
    apiPost<FtpAllocation>('/api/v1/ftp/allocate'),

  /** GET /v1/ftp/profitability/{entityType} */
  getProfitability: (entityType: string) =>
    apiGet<FtpAllocation[]>(`/api/v1/ftp/profitability/${entityType}`),

  /** GET /v1/ftp/history/{entityType}/{entityId} */
  getHistory: (entityType: string, entityId: number) =>
    apiGet<FtpAllocation[]>(`/api/v1/ftp/history/${entityType}/${entityId}`),

};
