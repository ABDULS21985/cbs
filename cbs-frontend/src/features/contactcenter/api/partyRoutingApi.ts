import { apiGet, apiPost } from '@/lib/api';
import type { PartyRoutingProfile } from '../types/partyRouting';

export const partyRoutingApi = {
  getByCustomer: (customerId: number) =>
    apiGet<PartyRoutingProfile>(`/api/v1/party-routing/customer/${customerId}`),
  getByRm: (rmId: string) =>
    apiGet<PartyRoutingProfile[]>(`/api/v1/party-routing/rm/${encodeURIComponent(rmId)}`),
  upsert: (data: Partial<PartyRoutingProfile>) =>
    apiPost<PartyRoutingProfile>('/api/v1/party-routing', data),
};
