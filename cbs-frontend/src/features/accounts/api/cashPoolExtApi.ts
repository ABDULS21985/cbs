import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { CashPoolParticipant } from './cashPoolApi';
import type { CashPoolSweepLog } from '../types/cashPoolExt';

export const cashPoolsApi = {
  /** POST /v1/cash-pools/{poolCode}/participants */
  addParticipant: (poolCode: string, data: Partial<CashPoolParticipant>) =>
    apiPost<CashPoolParticipant>(`/api/v1/cash-pools/${poolCode}/participants`, data),

  /** PATCH /v1/cash-pools/{poolCode}/participants/{participantId} */
  updateParticipant: (poolCode: string, participantId: number, data: Partial<CashPoolParticipant>) =>
    apiPatch<CashPoolParticipant>(`/api/v1/cash-pools/${poolCode}/participants/${participantId}`, data),

  /** DELETE /v1/cash-pools/{poolCode}/participants/{participantId} */
  removeParticipant: (poolCode: string, participantId: number) =>
    apiDelete<void>(`/api/v1/cash-pools/${poolCode}/participants/${participantId}`),

  /** POST /v1/cash-pools/{poolCode}/sweep */
  sweep: (poolCode: string) =>
    apiPost<CashPoolSweepLog[]>(`/api/v1/cash-pools/${poolCode}/sweep`),

  /** GET /v1/cash-pools/{poolCode}/participants */
  participants: (poolCode: string) =>
    apiGet<CashPoolParticipant[]>(`/api/v1/cash-pools/${poolCode}/participants`),
};
