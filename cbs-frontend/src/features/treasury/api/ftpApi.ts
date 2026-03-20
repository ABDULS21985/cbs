import { apiGet, apiPost } from '@/lib/api';
import type { FtpAllocation, FtpRateCurve } from '../types/ftp';

export interface AddFtpRatePointRequest {
  tenor: string;
  rate: number;
  effectiveDate: string;
  currency?: string;
}

export interface RunFtpAllocationRequest {
  entityType: string;
  period: string;
}

export const ftpApi = {
  getCurve: (currency?: string) =>
    apiGet<Array<FtpRateCurve & { tenor?: string; days?: number }>>('/api/v1/treasury/ftp/curve', currency ? { currency } : undefined),

  addRatePoint: (data: AddFtpRatePointRequest) =>
    apiPost<FtpRateCurve>('/api/v1/treasury/ftp/curve/points', data),

  getAllocations: (entityType?: string) =>
    apiGet<FtpAllocation[]>('/api/v1/treasury/ftp/allocations', entityType ? { entityType } : undefined),

  allocate: (data: RunFtpAllocationRequest) =>
    apiPost<FtpAllocation[]>('/api/v1/treasury/ftp/allocate', data),

  getProfitability: (entityType?: string) =>
    apiGet<FtpAllocation[]>('/api/v1/treasury/ftp/profitability', entityType ? { entityType } : undefined),

  getHistory: (entityType: string, entityId: number) =>
    apiGet<FtpAllocation[]>(`/api/v1/ftp/history/${entityType}/${entityId}`),
};
