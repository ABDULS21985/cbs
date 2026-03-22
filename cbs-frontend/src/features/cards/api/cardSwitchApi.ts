import { apiGet, apiPost } from '@/lib/api';
import type { CardSwitchTransaction } from '../types/cardSwitch';

export const cardSwitchApi = {
  /** POST /v1/card-switch/process */
  process: (data: Partial<CardSwitchTransaction>) =>
    apiPost<CardSwitchTransaction>('/api/v1/card-switch/process', data),

  /** GET /v1/card-switch/scheme/{scheme} */
  getByScheme: (scheme: string) =>
    apiGet<CardSwitchTransaction[]>(`/api/v1/card-switch/scheme/${scheme}`),

  /** GET /v1/card-switch/merchant/{merchantId} */
  getByMerchant: (merchantId: string) =>
    apiGet<CardSwitchTransaction[]>(`/api/v1/card-switch/merchant/${merchantId}`),

  /** GET /v1/card-switch/declines */
  getDeclines: (params?: Record<string, unknown>) =>
    apiGet<CardSwitchTransaction[]>('/api/v1/card-switch/declines', params),

  /** GET /v1/card-switch/scheme/{scheme}/stats/{date} */
  getStats: (scheme: string, date: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/card-switch/scheme/${scheme}/stats/${date}`),

};
