import { apiGet, apiPost } from '@/lib/api';
import type { CardNetworkMembership } from '../types/cardNetwork';

export const cardNetworksApi = {
  /** GET /v1/card-networks */
  getAll: () =>
    apiGet<CardNetworkMembership[]>('/api/v1/card-networks').catch(() => []),

  /** GET /v1/card-networks/{network} */
  getByNetwork: (network: string) =>
    apiGet<CardNetworkMembership[]>(`/api/v1/card-networks/${network}`).catch(() => []),

  /** POST /v1/card-networks */
  register: (data: Partial<CardNetworkMembership>) =>
    apiPost<CardNetworkMembership>('/api/v1/card-networks', data),
};
