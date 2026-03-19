import { apiGet, apiPost } from '@/lib/api';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type TppClientType = 'TPP_AISP' | 'TPP_PISP' | 'TPP_BOTH';
export type TppClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ConsentStatus = 'PENDING' | 'AUTHORISED' | 'REVOKED' | 'EXPIRED';

export interface TppClient {
  id: number;
  name: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  clientType: TppClientType;
  status: TppClientStatus;
  registeredAt: string;
}

export interface ApiConsent {
  id: number;
  consentId: string;
  tppClientId: number;
  tppClientName?: string;
  customerId: number;
  scopes: string[];
  status: ConsentStatus;
  expiresAt: string;
  authorisedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  createdAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const openBankingApi = {
  // TPP Clients
  getTppClients: () =>
    apiGet<TppClient[]>('/v1/openbanking/clients'),

  registerTppClient: (payload: {
    name: string;
    redirectUri: string;
    scopes: string[];
    clientType: TppClientType;
  }) => apiPost<TppClient>('/v1/openbanking/clients', payload),

  // Consents
  getCustomerConsents: (customerId: string | number) =>
    apiGet<ApiConsent[]>(`/v1/openbanking/consents/customer/${customerId}`),

  createConsent: (payload: {
    tppClientId: number;
    customerId: number;
    scopes: string[];
    expiresAt: string;
  }) => apiPost<ApiConsent>('/v1/openbanking/consents', payload),

  authoriseConsent: (consentId: string | number, customerId: number) =>
    apiPost<ApiConsent>(`/v1/openbanking/consents/${consentId}/authorise`, { customerId }),

  revokeConsent: (consentId: string | number, reason?: string) =>
    apiPost<void>(`/v1/openbanking/consents/${consentId}/revoke`, reason ? { reason } : undefined),
};
