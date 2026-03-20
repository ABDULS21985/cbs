import { apiGet, apiPost } from '@/lib/api';
import type { PosTerminal } from '../types/posTerminal';

export const posTerminalsApi = {
  /** GET /v1/pos-terminals */
  getAll: () =>
    apiGet<PosTerminal[]>('/api/v1/pos-terminals').catch(() => []),

  /** GET /v1/pos-terminals/{terminalId} */
  getById: (terminalId: string) =>
    apiGet<PosTerminal>(`/api/v1/pos-terminals/${terminalId}`),

  /** POST /v1/pos-terminals/heartbeat */
  heartbeat: (payload: { terminalId: string; status: string; softwareVersion: string }) =>
    apiPost<PosTerminal>('/api/v1/pos-terminals/heartbeat', payload),

  /** POST /v1/pos-terminals/heartbeat2 */
  heartbeat2: (payload: { terminalId: string; operationalStatus: string }) =>
    apiPost<PosTerminal>('/api/v1/pos-terminals/heartbeat2', payload),

  /** GET /v1/pos-terminals/merchant/{merchantId} */
  byMerchant: (merchantId: number) =>
    apiGet<PosTerminal[]>(`/api/v1/pos-terminals/merchant/${merchantId}`).catch(() => []),

  /** POST /v1/pos-terminals (deploy new terminal) */
  deploy: (payload: {
    terminalType: string;
    merchantId: string;
    locationAddress: string;
    supportsContactless: boolean;
    supportsChip: boolean;
    supportsMagstripe: boolean;
    supportsPin: boolean;
    supportsQr: boolean;
    maxTransactionAmount: number;
    acquiringBankCode: string;
  }) => apiPost<PosTerminal>('/api/v1/pos-terminals', payload),
};
