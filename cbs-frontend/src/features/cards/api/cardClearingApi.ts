import { apiGet, apiPost } from '@/lib/api';
import type { CardClearingBatch, CardSettlementPosition } from '../types/cardClearing';

export const cardClearingApi = {
  /** POST /v1/card-clearing/batches */
  ingest: (data: Partial<CardClearingBatch>) =>
    apiPost<CardClearingBatch>('/api/v1/card-clearing/batches', data),

  /** POST /v1/card-clearing/batches/{batchId}/settle */
  ingest2: (batchId: number, data: Partial<CardClearingBatch>) =>
    apiPost<CardClearingBatch>(`/api/v1/card-clearing/batches/${batchId}/settle`, data),

  /** POST /v1/card-clearing/positions */
  createPosition: (data: Partial<CardSettlementPosition>) =>
    apiPost<CardSettlementPosition>('/api/v1/card-clearing/positions', data),

  /** GET /v1/card-clearing/batches/{network}/{date} */
  createPosition2: (network: string, date: string) =>
    apiGet<CardSettlementPosition>(`/api/v1/card-clearing/batches/${network}/${date}`),

  /** GET /v1/card-clearing/positions/{date}/{network} */
  positions: (date: string, network: string) =>
    apiGet<CardSettlementPosition[]>(`/api/v1/card-clearing/positions/${date}/${network}`),

};
