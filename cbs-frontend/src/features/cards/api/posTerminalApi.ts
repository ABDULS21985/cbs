import { apiGet, apiPost } from '@/lib/api';
import type { PosTerminal } from '../types/posTerminal';

export const posTerminalsApi = {
  /** GET /v1/pos-terminals */
  getAll: () =>
    apiGet<PosTerminal[]>('/api/v1/pos-terminals'),

  /** GET /v1/pos-terminals/{terminalId} */
  getById: (terminalId: string) =>
    apiGet<PosTerminal>(`/api/v1/pos-terminals/${terminalId}`),

  /** POST /v1/pos-terminals/{terminalId}/heartbeat — path variable, no body */
  heartbeat: (terminalId: string) =>
    apiPost<PosTerminal>(`/api/v1/pos-terminals/${terminalId}/heartbeat`),

  /** POST /v1/pos-terminals/{terminalId}/status */
  updateStatus: (terminalId: string, status: string) =>
    apiPost<PosTerminal>(`/api/v1/pos-terminals/${terminalId}/status`, { status }),

  /** GET /v1/pos-terminals/merchant/{merchantId} */
  byMerchant: (merchantId: string) =>
    apiGet<PosTerminal[]>(`/api/v1/pos-terminals/merchant/${merchantId}`),

  /** POST /v1/pos-terminals (register new terminal) */
  deploy: (payload: {
    terminalId: string;
    terminalType: string;
    merchantId: string;
    merchantName: string;
    merchantCategoryCode?: string;
    locationAddress: string;
    supportsContactless?: boolean;
    supportsChip?: boolean;
    supportsMagstripe?: boolean;
    supportsPin?: boolean;
    supportsQr?: boolean;
    maxTransactionAmount?: number;
    acquiringBankCode?: string;
    softwareVersion?: string;
  }) => apiPost<PosTerminal>('/api/v1/pos-terminals', payload),
};
