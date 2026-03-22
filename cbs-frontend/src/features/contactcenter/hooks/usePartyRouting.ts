import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partyRoutingApi } from '../api/partyRoutingApi';
import type { PartyRoutingProfile } from '../types/partyRouting';

export const PARTY_ROUTING_KEYS = {
  byCustomer: (customerId: number) => ['party-routing', 'customer', customerId] as const,
  byRm: (rmId: string) => ['party-routing', 'rm', rmId] as const,
} as const;

export function usePartyRoutingProfile(customerId: number) {
  return useQuery({
    queryKey: PARTY_ROUTING_KEYS.byCustomer(customerId),
    queryFn: () => partyRoutingApi.getByCustomer(customerId),
    enabled: customerId > 0,
    retry: false,
  });
}

export function useUpsertPartyRouting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PartyRoutingProfile>) => partyRoutingApi.upsert(data),
    onSuccess: (_data, variables) => {
      if (variables.customerId) {
        qc.invalidateQueries({ queryKey: PARTY_ROUTING_KEYS.byCustomer(variables.customerId) });
      }
    },
  });
}
