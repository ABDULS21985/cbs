import api, { apiGet } from '@/lib/api';
import type { ApiResponse } from '@/types/common';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TppClientType = 'INTERNAL' | 'TPP_AISP' | 'TPP_PISP' | 'TPP_BOTH' | 'TPP_CBPII' | 'PARTNER' | 'SANDBOX';
export type TppClientStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ConsentStatus = 'PENDING' | 'AUTHORISED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';

export interface TppClient {
  id: number;
  clientName?: string;
  name: string;
  clientId: string;
  apiKey?: string;
  clientSecret?: string;
  redirectUris?: string[];
  redirectUri: string;
  allowedScopes?: string[];
  scopes: string[];
  clientType: TppClientType;
  status: TppClientStatus;
  isActive?: boolean;
  dailyRequestCount?: number;
  registeredAt: string;
  createdAt?: string;
  updatedAt?: string;
  activeConsents?: number;
  apiCalls30d?: number;
}

export interface ApiConsent {
  id: number;
  consentId: string;
  clientId: string;
  tppClientId?: number;
  tppClientName?: string;
  customerId: number;
  consentType?: string;
  permissions?: string[];
  scopes: string[];
  accountIds?: number[];
  status: ConsentStatus;
  rawStatus?: string;
  expiresAt: string;
  grantedAt?: string;
  authorisedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  createdAt: string;
}

export interface RegisterTppPayload {
  name: string;
  clientId?: string;
  apiKey?: string;
  redirectUri: string;
  scopes: string[];
  clientType: TppClientType;
}

export interface CreateConsentPayload {
  clientId: string;
  customerId: number;
  consentType: string;
  permissions: string[];
  accountIds?: number[];
  validityMinutes?: number;
}

interface BackendApiClient {
  id: number;
  clientId: string;
  clientName: string;
  clientType: TppClientType;
  redirectUris?: string[];
  allowedScopes?: string[];
  dailyRequestCount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendApiConsent {
  id: number;
  consentId: string;
  clientId: string;
  customerId: number;
  consentType: string;
  permissions?: string[];
  accountIds?: number[];
  grantedAt?: string;
  expiresAt: string;
  revokedAt?: string;
  status: string;
  createdAt: string;
}

interface ClientRegistrationResponse {
  client: BackendApiClient;
  apiKey: string;
}

function buildClientNameMap(clients: BackendApiClient[]): Record<string, string> {
  return Object.fromEntries(clients.map((c) => [c.clientId, c.clientName]));
}

function mapClient(client: BackendApiClient, apiKey?: string): TppClient {
  const scopes = client.allowedScopes ?? [];
  const redirectUri = client.redirectUris?.[0] ?? '';

  return {
    id: client.id,
    clientName: client.clientName,
    name: client.clientName,
    clientId: client.clientId,
    apiKey,
    clientSecret: apiKey,
    redirectUris: client.redirectUris ?? [],
    redirectUri,
    allowedScopes: scopes,
    scopes,
    clientType: client.clientType,
    status: client.isActive ? 'ACTIVE' : 'INACTIVE',
    isActive: client.isActive,
    dailyRequestCount: client.dailyRequestCount ?? 0,
    registeredAt: client.createdAt ?? new Date().toISOString(),
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    apiCalls30d: client.dailyRequestCount ?? 0,
  };
}

function mapConsent(consent: BackendApiConsent, clientNameMap: Record<string, string>): ApiConsent {
  const now = Date.now();
  const expiresAtMs = new Date(consent.expiresAt).getTime();
  const isExpired = Number.isFinite(expiresAtMs) && expiresAtMs < now;

  let status: ConsentStatus;
  if (consent.status === 'REVOKED') {
    status = 'REVOKED';
  } else if (consent.status === 'REJECTED') {
    status = 'REJECTED';
  } else if (isExpired) {
    status = 'EXPIRED';
  } else if (consent.status === 'AUTHORISED') {
    status = 'AUTHORISED';
  } else {
    // AWAITING_AUTHORISATION or any other pending status
    status = 'PENDING';
  }

  const scopes = consent.permissions ?? [];

  return {
    id: consent.id,
    consentId: consent.consentId,
    clientId: consent.clientId,
    tppClientName: clientNameMap[consent.clientId],
    customerId: consent.customerId,
    consentType: consent.consentType,
    permissions: scopes,
    scopes,
    accountIds: consent.accountIds ?? [],
    status,
    rawStatus: consent.status,
    expiresAt: consent.expiresAt,
    grantedAt: consent.grantedAt,
    authorisedAt: consent.status === 'AUTHORISED' ? consent.grantedAt : undefined,
    revokedAt: consent.revokedAt,
    createdAt: consent.createdAt,
  };
}

function generateClientId(name: string): string {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${normalized || 'TPP'}_${suffix}`;
}

function generateApiKey(): string {
  const random = crypto.randomUUID().replace(/-/g, '');
  return `cbs_ob_${random}`;
}

// ─── API ────────────────────────────────────────────────────────────────────

export const openBankingApi = {
  // TPP Clients
  getTppClients: () =>
    apiGet<BackendApiClient[]>('/api/v1/openbanking/clients').then((clients) => clients.map((c) => mapClient(c))),

  async registerTppClient(payload: RegisterTppPayload): Promise<TppClient> {
    const clientId = payload.clientId?.trim() || generateClientId(payload.name);
    const apiKey = payload.apiKey?.trim() || generateApiKey();

    const body = {
      clientId,
      clientName: payload.name,
      clientType: payload.clientType,
      redirectUris: [payload.redirectUri],
      allowedScopes: payload.scopes,
      rateLimitPerSecond: 10,
      rateLimitPerDay: 10000,
      apiVersion: 'v1',
      isActive: true,
    };

    const response = await api.post<ApiResponse<ClientRegistrationResponse>>('/api/v1/openbanking/clients', body, {
      params: { apiKey },
    });

    return mapClient(response.data.data.client, response.data.data.apiKey);
  },

  // Consents
  async getConsents(): Promise<ApiConsent[]> {
    const [clients, consents] = await Promise.all([
      apiGet<BackendApiClient[]>('/api/v1/openbanking/clients'),
      apiGet<BackendApiConsent[]>('/api/v1/openbanking/consents'),
    ]);

    const clientNameMap = buildClientNameMap(clients);
    return consents.map((c) => mapConsent(c, clientNameMap));
  },

  async getCustomerConsents(customerId: string | number): Promise<ApiConsent[]> {
    const [clients, consents] = await Promise.all([
      apiGet<BackendApiClient[]>('/api/v1/openbanking/clients'),
      apiGet<BackendApiConsent[]>(`/api/v1/openbanking/consents/customer/${customerId}`),
    ]);

    const clientNameMap = buildClientNameMap(clients);
    return consents.map((c) => mapConsent(c, clientNameMap));
  },

  async createConsent(payload: CreateConsentPayload): Promise<ApiConsent> {
    const response = await api.post<ApiResponse<BackendApiConsent>>('/api/v1/openbanking/consents', undefined, {
      params: {
        clientId: payload.clientId,
        customerId: payload.customerId,
        consentType: payload.consentType,
        permissions: payload.permissions,
        accountIds: payload.accountIds,
        validityMinutes: payload.validityMinutes ?? 1440,
      },
    });

    const clients = await apiGet<BackendApiClient[]>('/api/v1/openbanking/clients');
    const clientNameMap = buildClientNameMap(clients);
    return mapConsent(response.data.data, clientNameMap);
  },

  async authoriseConsent(consentId: string | number, customerId: number): Promise<ApiConsent> {
    const response = await api.post<ApiResponse<BackendApiConsent>>(
      `/api/v1/openbanking/consents/${consentId}/authorise`,
      undefined,
      { params: { customerId } },
    );

    const clients = await apiGet<BackendApiClient[]>('/api/v1/openbanking/clients');
    const clientNameMap = buildClientNameMap(clients);
    return mapConsent(response.data.data, clientNameMap);
  },

  async revokeConsent(consentId: string | number): Promise<ApiConsent> {
    const response = await api.post<ApiResponse<BackendApiConsent>>(
      `/api/v1/openbanking/consents/${consentId}/revoke`,
    );

    const clients = await apiGet<BackendApiClient[]>('/api/v1/openbanking/clients');
    const clientNameMap = buildClientNameMap(clients);
    return mapConsent(response.data.data, clientNameMap);
  },
};
