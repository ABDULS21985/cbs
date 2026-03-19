import { apiGet } from '@/lib/api';
import type { SettlementBatch, SettlementInstruction } from '../types/settlement';

export const settlementsApi = {
  /** GET /v1/settlements/instructions */
  listInstructions: (params?: Record<string, unknown>) =>
    apiGet<SettlementInstruction[]>('/api/v1/settlements/instructions', params),

  /** GET /v1/settlements/batches */
  listBatches: (params?: Record<string, unknown>) =>
    apiGet<SettlementBatch[]>('/api/v1/settlements/batches', params),

};
