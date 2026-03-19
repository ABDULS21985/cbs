import { apiGet, apiPost } from '@/lib/api';
import type { PosTerminal } from '../types/posTerminal';

export const posTerminalsApi = {
  /** POST /v1/pos-terminals/{terminalId}/heartbeat */
  heartbeat: (terminalId: number) =>
    apiPost<PosTerminal>(`/api/v1/pos-terminals/${terminalId}/heartbeat`),

  /** POST /v1/pos-terminals/{terminalId}/status */
  heartbeat2: (terminalId: number) =>
    apiPost<PosTerminal>(`/api/v1/pos-terminals/${terminalId}/status`),

  /** GET /v1/pos-terminals/merchant/{merchantId} */
  byMerchant: (merchantId: number) =>
    apiGet<PosTerminal[]>(`/api/v1/pos-terminals/merchant/${merchantId}`),

};
