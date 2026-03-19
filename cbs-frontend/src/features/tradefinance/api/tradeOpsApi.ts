import { apiGet, apiPost } from '@/lib/api';
import type { ClearingSubmission, OrderAllocation, TradeConfirmation, TradeReport } from '../types/tradeOps';

export const tradeOpsApi = {
  /** POST /v1/trade-ops/confirmations */
  submitConfirmation: (data: Partial<TradeConfirmation>) =>
    apiPost<TradeConfirmation>('/api/v1/trade-ops/confirmations', data),

  /** POST /v1/trade-ops/confirmations/match */
  matchConfirmation: () =>
    apiPost<TradeConfirmation[]>('/api/v1/trade-ops/confirmations/match'),

  /** POST /v1/trade-ops/allocations */
  allocateOrder: (data: Partial<OrderAllocation>) =>
    apiPost<OrderAllocation>('/api/v1/trade-ops/allocations', data),

  /** POST /v1/trade-ops/reports */
  submitTradeReport: (data: Partial<TradeReport>) =>
    apiPost<TradeReport>('/api/v1/trade-ops/reports', data),

  /** POST /v1/trade-ops/clearing */
  submitForClearing: (data: Partial<ClearingSubmission>) =>
    apiPost<ClearingSubmission>('/api/v1/trade-ops/clearing', data),

  /** GET /v1/trade-ops/confirmations/unmatched */
  getUnmatched: (params?: Record<string, unknown>) =>
    apiGet<TradeConfirmation[]>('/api/v1/trade-ops/confirmations/unmatched', params),

  /** GET /v1/trade-ops/clearing/pending */
  getPendingClearing: (params?: Record<string, unknown>) =>
    apiGet<ClearingSubmission[]>('/api/v1/trade-ops/clearing/pending', params),

};
