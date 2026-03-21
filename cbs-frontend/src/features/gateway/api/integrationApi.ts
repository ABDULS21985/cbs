import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { DeadLetterQueue, IntegrationMessage, IntegrationRoute, Iso20022CodeSet, Iso20022Message, Psd2ScaSession, Psd2TppRegistration, ApiClientRegistration, OpenBankingConsent } from '../types/integration';

export const integrationApi = {
  /** POST /v1/integration/esb/routes */
  createRoute: (data: Partial<IntegrationRoute>) =>
    apiPost<IntegrationRoute>('/api/v1/integration/esb/routes', data),

  /** GET /v1/integration/esb/routes */
  getRoutes: (params?: Record<string, unknown>) =>
    apiGet<IntegrationRoute[]>('/api/v1/integration/esb/routes', params),

  /** POST /v1/integration/esb/routes/{routeCode}/health-check */
  healthCheck: (routeCode: string) =>
    apiPost<IntegrationRoute>(`/api/v1/integration/esb/routes/${routeCode}/health-check`),

  /** POST /v1/integration/esb/messages */
  sendMessage: (data: Record<string, unknown>) =>
    apiPost<IntegrationMessage>('/api/v1/integration/esb/messages', data),

  /** GET /v1/integration/esb/messages */
  listMessages: () =>
    apiGet<IntegrationMessage[]>('/api/v1/integration/esb/messages'),

  /** POST /v1/integration/esb/dlq/retry */
  retryDeadLetters: () =>
    apiPost<Record<string, unknown>>('/api/v1/integration/esb/dlq/retry'),

  /** POST /v1/integration/esb/dlq/{id}/resolve */
  resolve: (id: number) =>
    apiPost<DeadLetterQueue>(`/api/v1/integration/esb/dlq/${id}/resolve`),

  /** GET /v1/integration/esb/dlq/count */
  dlqCount: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/integration/esb/dlq/count', params),

  /** POST /v1/integration/iso20022/messages */
  ingest: (data: Partial<Iso20022Message>) =>
    apiPost<Iso20022Message>('/api/v1/integration/iso20022/messages', data),

  /** GET /v1/integration/iso20022/messages — list all ISO messages */
  listIsoMessages: () =>
    apiGet<Iso20022Message[]>('/api/v1/integration/iso20022/messages'),

  /** PATCH /v1/integration/iso20022/messages/{messageId}/status — messageId is String, status is @RequestParam */
  updateStatus: (messageId: string, status: string) =>
    apiPatch<Iso20022Message>(`/api/v1/integration/iso20022/messages/${messageId}/status?status=${encodeURIComponent(status)}`),

  /** GET /v1/integration/iso20022/messages/status/{status} */
  getByStatus: (status: string) =>
    apiGet<Iso20022Message[]>(`/api/v1/integration/iso20022/messages/status/${status}`),

  /** GET /v1/integration/iso20022/codes/{codeSetName} */
  getCodeSet: (codeSetName: string) =>
    apiGet<Iso20022CodeSet[]>(`/api/v1/integration/iso20022/codes/${codeSetName}`),

  /** GET /v1/integration/iso20022/codes/{codeSetName}/{code} */
  lookupCode: (codeSetName: string, code: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/integration/iso20022/codes/${codeSetName}/${code}`),

  /** GET /v1/integration/iso20022/swift-migration-map */
  getSwiftMapping: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>>('/api/v1/integration/iso20022/swift-migration-map', params),

  /** POST /v1/integration/psd2/tpp */
  registerTpp: (data: Partial<Psd2TppRegistration>) =>
    apiPost<Psd2TppRegistration>('/api/v1/integration/psd2/tpp', data),

  /** GET /v1/integration/psd2/tpp — list ALL TPPs */
  getAllTpps: () =>
    apiGet<Psd2TppRegistration[]>('/api/v1/integration/psd2/tpp'),

  /** POST /v1/integration/psd2/tpp/{tppId}/activate — tppId is String */
  activate: (tppId: string) =>
    apiPost<Psd2TppRegistration>(`/api/v1/integration/psd2/tpp/${tppId}/activate`),

  /** POST /v1/integration/psd2/tpp/{tppId}/suspend — tppId is String */
  suspend: (tppId: string) =>
    apiPost<Psd2TppRegistration>(`/api/v1/integration/psd2/tpp/${tppId}/suspend`),

  /** GET /v1/integration/psd2/tpp/active */
  getActiveTpps: (params?: Record<string, unknown>) =>
    apiGet<Psd2TppRegistration[]>('/api/v1/integration/psd2/tpp/active', params),

  /** POST /v1/integration/psd2/sca/initiate — uses @RequestParam for all fields */
  initiateSca: (data: {
    tppId: string; customerId: number; scaMethod: string;
    paymentId?: number; consentId?: string; amount?: number;
    ipAddress?: string; userAgent?: string;
  }) => {
    const p = new URLSearchParams();
    p.set('tppId', data.tppId);
    p.set('customerId', String(data.customerId));
    p.set('scaMethod', data.scaMethod);
    if (data.paymentId) p.set('paymentId', String(data.paymentId));
    if (data.consentId) p.set('consentId', data.consentId);
    if (data.amount != null) p.set('amount', String(data.amount));
    if (data.ipAddress) p.set('ipAddress', data.ipAddress);
    if (data.userAgent) p.set('userAgent', data.userAgent);
    return apiPost<Psd2ScaSession>(`/api/v1/integration/psd2/sca/initiate?${p.toString()}`);
  },

  /** POST /v1/integration/psd2/sca/{sessionId}/finalise — sessionId is String, success is @RequestParam */
  finaliseSca: (sessionId: string, success: boolean) =>
    apiPost<Psd2ScaSession>(`/api/v1/integration/psd2/sca/${sessionId}/finalise?success=${success}`),

  /** GET /v1/integration/psd2/sca/customer/{customerId} */
  getCustomerSessions: (customerId: number) =>
    apiGet<Psd2ScaSession[]>(`/api/v1/integration/psd2/sca/customer/${customerId}`),

  // ── Open Banking API Clients (backend: /v1/openbanking) ─────────────────

  /** GET /v1/openbanking/clients */
  getApiClients: () =>
    apiGet<ApiClientRegistration[]>('/api/v1/openbanking/clients'),

  /** POST /v1/openbanking/clients — requires apiKey query param */
  registerApiClient: (data: Partial<ApiClientRegistration>, apiKey?: string) => {
    const params = apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : '';
    return apiPost<ApiClientRegistration>(`/api/v1/openbanking/clients${params}`, data);
  },

  // ── Open Banking Consents ───────────────────────────────────────────────

  /** GET /v1/openbanking/consents */
  getConsents: (params?: Record<string, unknown>) =>
    apiGet<OpenBankingConsent[]>('/api/v1/openbanking/consents', params),

  /** POST /v1/openbanking/consents — uses @RequestParam, not @RequestBody */
  createConsent: (data: {
    clientId: string; customerId: number; consentType: string;
    permissions: string[]; accountIds?: number[]; validityMinutes?: number;
  }) => {
    const p = new URLSearchParams();
    p.set('clientId', data.clientId);
    p.set('customerId', String(data.customerId));
    p.set('consentType', data.consentType);
    data.permissions.forEach((perm) => p.append('permissions', perm));
    if (data.accountIds) data.accountIds.forEach((id) => p.append('accountIds', String(id)));
    if (data.validityMinutes) p.set('validityMinutes', String(data.validityMinutes));
    return apiPost<OpenBankingConsent>(`/api/v1/openbanking/consents?${p.toString()}`);
  },

  /** POST /v1/openbanking/consents/{consentId}/authorise — requires customerId @RequestParam */
  authoriseConsent: (consentId: string, customerId: number) =>
    apiPost<OpenBankingConsent>(`/api/v1/openbanking/consents/${consentId}/authorise?customerId=${customerId}`),

  /** POST /v1/openbanking/consents/{consentId}/revoke */
  revokeConsent: (consentId: string) =>
    apiPost<OpenBankingConsent>(`/api/v1/openbanking/consents/${consentId}/revoke`),

  /** GET /v1/openbanking/consents/customer/{customerId} */
  getCustomerConsents: (customerId: number) =>
    apiGet<OpenBankingConsent[]>(`/api/v1/openbanking/consents/customer/${customerId}`),
};
