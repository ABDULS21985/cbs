import { apiGet } from '@/lib/api';
import type { CardNetworkMembership } from '../types/cardNetwork';

export const cardNetworksApi = {
  /** GET /v1/card-networks/{network} */
  register: (network: string) =>
    apiGet<CardNetworkMembership>(`/api/v1/card-networks/${network}`),

};
