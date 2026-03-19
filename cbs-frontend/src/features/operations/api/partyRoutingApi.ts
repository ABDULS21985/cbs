import { apiGet } from '@/lib/api';
import type { PartyRoutingProfile } from '../types/partyRouting';

export const partyRoutingApi = {
  /** GET /v1/party-routing/customer/{customerId} */
  byCustomer: (customerId: number) =>
    apiGet<PartyRoutingProfile>(`/api/v1/party-routing/customer/${customerId}`),

  /** GET /v1/party-routing/rm/{rmId} */
  byRm: (rmId: number) =>
    apiGet<PartyRoutingProfile[]>(`/api/v1/party-routing/rm/${rmId}`),

};
