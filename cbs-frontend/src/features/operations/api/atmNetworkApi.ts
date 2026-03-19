import { apiGet, apiPost } from '@/lib/api';
import type { AtmNetworkNode } from '../types/atmNetwork';

export const atmNetworkApi = {
  /** POST /v1/atm-network/{terminalId}/status */
  register: (terminalId: number, data: Partial<AtmNetworkNode>) =>
    apiPost<AtmNetworkNode>(`/api/v1/atm-network/${terminalId}/status`, data),

  /** POST /v1/atm-network/{terminalId}/replenish */
  replenish: (terminalId: number) =>
    apiPost<AtmNetworkNode>(`/api/v1/atm-network/${terminalId}/replenish`),

  /** GET /v1/atm-network/status/{status} */
  replenish2: (status: string) =>
    apiGet<AtmNetworkNode>(`/api/v1/atm-network/status/${status}`),

  /** GET /v1/atm-network/zone/{zone} */
  byZone: (zone: string) =>
    apiGet<AtmNetworkNode[]>(`/api/v1/atm-network/zone/${zone}`),

};
