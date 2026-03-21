import { apiGet, apiPost } from '@/lib/api';
import type { ClearingSubmission, OrderAllocation, TradeConfirmation, TradeReport } from '../types/tradeOps';

export const tradeOpsApi = {
  // ── Confirmations ────────────────────────────────────────────────────────────
  /** GET /v1/trade-ops/confirmations */
  listConfirmations: () =>
    apiGet<TradeConfirmation[]>('/api/v1/trade-ops/confirmations'),

  /** POST /v1/trade-ops/confirmations */
  submitConfirmation: (data: Partial<TradeConfirmation>) =>
    apiPost<TradeConfirmation>('/api/v1/trade-ops/confirmations', data),

  /** POST /v1/trade-ops/confirmations/match */
  matchConfirmations: () =>
    apiPost<TradeConfirmation[]>('/api/v1/trade-ops/confirmations/match'),

  /** GET /v1/trade-ops/confirmations/unmatched */
  getUnmatched: (params?: Record<string, unknown>) =>
    apiGet<TradeConfirmation[]>('/api/v1/trade-ops/confirmations/unmatched', params),

  // ── Allocations ──────────────────────────────────────────────────────────────
  /** GET /v1/trade-ops/allocations */
  listAllocations: () =>
    apiGet<OrderAllocation[]>('/api/v1/trade-ops/allocations'),

  /** POST /v1/trade-ops/allocations */
  allocateOrder: (data: Partial<OrderAllocation>) =>
    apiPost<OrderAllocation>('/api/v1/trade-ops/allocations', data),

  // ── Clearing ─────────────────────────────────────────────────────────────────
  /** GET /v1/trade-ops/clearing */
  listClearing: () =>
    apiGet<ClearingSubmission[]>('/api/v1/trade-ops/clearing'),

  /** POST /v1/trade-ops/clearing */
  submitForClearing: (data: Partial<ClearingSubmission>) =>
    apiPost<ClearingSubmission>('/api/v1/trade-ops/clearing', data),

  /** GET /v1/trade-ops/clearing/pending */
  getPendingClearing: (params?: Record<string, unknown>) =>
    apiGet<ClearingSubmission[]>('/api/v1/trade-ops/clearing/pending', params),

  // ── Reports ──────────────────────────────────────────────────────────────────
  /** GET /v1/trade-ops/reports */
  listReports: () =>
    apiGet<TradeReport[]>('/api/v1/trade-ops/reports'),

  /** POST /v1/trade-ops/reports */
  submitTradeReport: (data: Partial<TradeReport>) =>
    apiPost<TradeReport>('/api/v1/trade-ops/reports', data),
};
