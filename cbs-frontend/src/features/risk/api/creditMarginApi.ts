import { apiGet, apiPost } from '@/lib/api';
import type { MarginCall } from '../types/creditMargin';

export const creditMarginApi = {
  /** POST /v1/credit-margin/margin-calls */
  issue: (data: Partial<MarginCall>) =>
    apiPost<MarginCall>('/api/v1/credit-margin/margin-calls', data),

  /** POST /v1/credit-margin/margin-calls/{ref}/acknowledge */
  issue2: (ref: string, data: Partial<MarginCall>) =>
    apiPost<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}/acknowledge`, data),

  /** POST /v1/credit-margin/margin-calls/{ref}/settle */
  settle: (ref: string, data: Record<string, unknown>) =>
    apiPost<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}/settle`, data),

  /** POST /v1/credit-margin/collateral */
  settle2: (data: Record<string, unknown>) =>
    apiPost<MarginCall>('/api/v1/credit-margin/collateral', data),

  /** GET /v1/credit-margin/margin-calls/counterparty/{code} */
  byCounterparty: (code: string) =>
    apiGet<MarginCall[]>(`/api/v1/credit-margin/margin-calls/counterparty/${code}`),

  /** GET /v1/credit-margin/margin-calls/open */
  byCounterparty2: (params?: Record<string, unknown>) =>
    apiGet<MarginCall[]>('/api/v1/credit-margin/margin-calls/open', params),

  /** GET /v1/credit-margin/margin-calls/{ref} */
  getCall: (ref: string) =>
    apiGet<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}`),

};
