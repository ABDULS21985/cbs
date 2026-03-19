import { apiGet, apiPost } from '@/lib/api';
import type { CashPoolParticipant, CashPoolSweepLog } from '../types/cashPoolExt';

export const cashPoolsApi = {
  /** POST /v1/cash-pools/{poolCode}/participants */
  addParticipant: (poolCode: string, data: Partial<CashPoolParticipant>) =>
    apiPost<CashPoolParticipant>(`/api/v1/cash-pools/${poolCode}/participants`, data),

  /** POST /v1/cash-pools/{poolCode}/sweep */
  sweep: (poolCode: string) =>
    apiPost<CashPoolSweepLog[]>(`/api/v1/cash-pools/${poolCode}/sweep`),

  /** GET /v1/cash-pools/{poolCode}/participants */
  participants: (poolCode: string) =>
    apiGet<CashPoolParticipant[]>(`/api/v1/cash-pools/${poolCode}/participants`),

};
