import { apiGet, apiPost } from '@/lib/api';
import type { OpRiskKri, OpRiskKriReading, OpRiskLossEvent } from '../types/opriskExt';

export const opriskApi = {
  /** POST /v1/oprisk/loss-events */
  reportEvent: () =>
    apiPost<OpRiskLossEvent>('/api/v1/oprisk/loss-events'),

  /** GET /v1/oprisk/loss-events/{category} */
  getLossEvents: (category: string) =>
    apiGet<OpRiskLossEvent[]>(`/api/v1/oprisk/loss-events/${category}`),

  /** GET /v1/oprisk/loss-events/total */
  getTotalLoss: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/oprisk/loss-events/total', params),

  /** POST /v1/oprisk/kris */
  createKri: (data: Partial<OpRiskKri>) =>
    apiPost<OpRiskKri>('/api/v1/oprisk/kris', data),

  /** GET /v1/oprisk/kris */
  getKris: (params?: Record<string, unknown>) =>
    apiGet<OpRiskKri[]>('/api/v1/oprisk/kris', params),

  /** POST /v1/oprisk/kris/{kriCode}/readings */
  recordReading: (kriCode: string) =>
    apiPost<OpRiskKriReading>(`/api/v1/oprisk/kris/${kriCode}/readings`),

  /** GET /v1/oprisk/dashboard/{date} */
  getDashboard: (date: string) =>
    apiGet<OpRiskKriReading[]>(`/api/v1/oprisk/dashboard/${date}`),

};
