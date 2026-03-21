import { apiGet, apiPost } from '@/lib/api';

export interface InterbankRelationship {
  id: number;
  counterpartyCode: string;
  counterpartyName: string;
  relationshipType: string;
  creditLineAmount: number;
  utilizedAmount: number;
  availableAmount: number;
  currency: string;
  agreementDate: string;
  expiryDate: string;
  status: string;
  nettingAgreement: boolean;
  isdaAgreement: boolean;
  csaAgreement: boolean;
  createdAt: string;
}

export const interbankApi = {
  // Backend: GET /v1/interbank-relationships
  list: () =>
    apiGet<InterbankRelationship[]>('/api/v1/interbank-relationships'),

  // Backend: GET /v1/interbank-relationships/type/{type}
  getByType: (type: string) =>
    apiGet<InterbankRelationship[]>(`/api/v1/interbank-relationships/type/${type}`),

  // Backend: POST /v1/interbank-relationships with @RequestBody InterbankRelationship
  create: (data: Partial<InterbankRelationship>) =>
    apiPost<InterbankRelationship>('/api/v1/interbank-relationships', data),
};
