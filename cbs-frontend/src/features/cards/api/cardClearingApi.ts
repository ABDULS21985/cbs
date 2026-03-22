import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { CardClearingBatch, CardSettlementPosition } from '../types/cardClearing';

export const cardClearingApi = {
  /** POST /v1/card-clearing/batches — ingest clearing batch */
  ingest: (data: Partial<CardClearingBatch>) =>
    apiPost<CardClearingBatch>('/api/v1/card-clearing/batches', data),

  /** POST /v1/card-clearing/manual — manually create clearing batch */
  manualBatch: (data: Partial<CardClearingBatch>) =>
    apiPost<CardClearingBatch>('/api/v1/card-clearing/manual', data),

  /** POST /v1/card-clearing/batches/{batchId}/settle — settle a batch */
  settleBatch: (batchId: string) =>
    apiPost<CardClearingBatch>(`/api/v1/card-clearing/batches/${batchId}/settle`),

  /** POST /v1/card-clearing/positions — create settlement position */
  createPosition: (data: Partial<CardSettlementPosition>) =>
    apiPost<CardSettlementPosition>('/api/v1/card-clearing/positions', data),

  /** POST /v1/card-clearing/settlement/create — create settlement position (alias) */
  createSettlement: (data: Partial<CardSettlementPosition>) =>
    apiPost<CardSettlementPosition>('/api/v1/card-clearing/settlement/create', data),

  /** PATCH /v1/card-clearing/positions/{id}/status — update position status */
  updatePositionStatus: (id: number, status: string, notes?: string) =>
    apiPatch<CardSettlementPosition>(`/api/v1/card-clearing/positions/${id}/status`, { status, notes }),

  /** POST /v1/card-clearing/positions/{id}/escalate — escalate position */
  escalatePosition: (id: number, reason?: string) =>
    apiPost<CardSettlementPosition>(`/api/v1/card-clearing/positions/${id}/escalate`, { reason }),

  /** GET /v1/card-clearing/batches — list all batches */
  getAllBatches: () =>
    apiGet<CardClearingBatch[]>('/api/v1/card-clearing/batches'),

  /** GET /v1/card-clearing/batches/detail/{batchId} — single batch detail */
  getBatchDetail: (batchId: string) =>
    apiGet<CardClearingBatch>(`/api/v1/card-clearing/batches/detail/${batchId}`),

  /** GET /v1/card-clearing/batches/{network}/{date} — batches by network + date */
  getBatchesByNetwork: (network: string, date: string) =>
    apiGet<CardClearingBatch[]>(`/api/v1/card-clearing/batches/${network}/${date}`),

  /** GET /v1/card-clearing/positions — list all positions */
  getAllPositions: () =>
    apiGet<CardSettlementPosition[]>('/api/v1/card-clearing/positions'),

  /** GET /v1/card-clearing/positions/{date}/{network} — positions by date + network */
  positions: (date: string, network: string) =>
    apiGet<CardSettlementPosition[]>(`/api/v1/card-clearing/positions/${date}/${network}`),

  // Legacy aliases for backward compatibility
  /** @deprecated Use settleBatch */
  ingest2: (batchId: number, data: Partial<CardClearingBatch>) =>
    apiPost<CardClearingBatch>(`/api/v1/card-clearing/batches/${batchId}/settle`, data),

  /** @deprecated Use getBatchesByNetwork */
  createPosition2: (network: string, date: string) =>
    apiGet<CardSettlementPosition>(`/api/v1/card-clearing/batches/${network}/${date}`),
};
