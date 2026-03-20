import { apiGet, apiPost } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TppClientType = 'TPP_AISP' | 'TPP_PISP' | 'TPP_BOTH';
export type TppClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ConsentStatus = 'PENDING' | 'AUTHORISED' | 'REVOKED' | 'EXPIRED';

export interface TppClient {
  id: number;
  name: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  clientType: TppClientType;
  status: TppClientStatus;
  registeredAt: string;
  activeConsents?: number;
  apiCalls30d?: number;
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

export interface RegisterTppPayload {
  name: string;
  redirectUri: string;
  scopes: string[];
  clientType: TppClientType;
}

export interface CreateConsentPayload {
  tppClientId: number;
  customerId: number;
  scopes: string[];
  expiresAt: string;
}

// ─── API ────────────────────────────────────────────────────────────────────

export const openBankingApi = {
  // TPP Clients
  getTppClients: () =>
    apiGet<TppClient[]>('/api/v1/openbanking/clients'),

  registerTppClient: (payload: RegisterTppPayload) =>
    apiPost<TppClient>('/api/v1/openbanking/clients', payload),

  // Consents
  getConsents: (params?: Record<string, unknown>) =>
    apiGet<ApiConsent[]>('/api/v1/openbanking/consents', params),

  getCustomerConsents: (customerId: string | number) =>
    apiGet<ApiConsent[]>(`/api/v1/openbanking/consents/customer/${customerId}`),

  createConsent: (payload: CreateConsentPayload) =>
    apiPost<ApiConsent>('/api/v1/openbanking/consents', payload),

  authoriseConsent: (consentId: string | number, customerId: number) =>
    apiPost<ApiConsent>(`/api/v1/openbanking/consents/${consentId}/authorise`, { customerId }),

  revokeConsent: (consentId: string | number, reason?: string) =>
    apiPost<void>(`/api/v1/openbanking/consents/${consentId}/revoke`, reason ? { reason } : undefined),
};
