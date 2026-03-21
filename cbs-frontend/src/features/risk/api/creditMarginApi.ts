import { apiGet, apiPost } from '@/lib/api';
import type { MarginCall } from '../types/creditMargin';

export const creditMarginApi = {
  /** POST /v1/credit-margin/margin-calls — Issue a new margin call */
  issue: (data: Partial<MarginCall>) =>
    apiPost<MarginCall>('/api/v1/credit-margin/margin-calls', data),

  /** POST /v1/credit-margin/margin-calls/{ref}/acknowledge — Acknowledge a margin call */
  acknowledge: (ref: string, data: Partial<MarginCall>) =>
    apiPost<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}/acknowledge`, data),

  /** POST /v1/credit-margin/margin-calls/{ref}/settle — Settle a margin call */
  settle: (ref: string, data: Record<string, unknown>) =>
    apiPost<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}/settle`, data),

  /** POST /v1/credit-margin/collateral — Post collateral */
  postCollateral: (data: Record<string, unknown>) =>
    apiPost<MarginCall>('/api/v1/credit-margin/collateral', data),

  /** GET /v1/credit-margin/margin-calls/counterparty/{code} — Get calls by counterparty */
  getByCounterparty: (code: string) =>
    apiGet<MarginCall[]>(`/api/v1/credit-margin/margin-calls/counterparty/${code}`),

  /** GET /v1/credit-margin/margin-calls/open — Get all open margin calls */
  getOpenCalls: (params?: Record<string, unknown>) =>
    apiGet<MarginCall[]>('/api/v1/credit-margin/margin-calls/open', params),

  /** GET /v1/credit-margin/margin-calls/{ref} — Get a specific margin call */
  getCall: (ref: string) =>
    apiGet<MarginCall>(`/api/v1/credit-margin/margin-calls/${ref}`),
};
