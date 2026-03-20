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

  /** PATCH /v1/integration/iso20022/messages/{messageId}/status */
  updateStatus: (messageId: number) =>
    apiPatch<Iso20022Message>(`/api/v1/integration/iso20022/messages/${messageId}/status`),

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

  /** POST /v1/integration/psd2/tpp/{tppId}/activate */
  activate: (tppId: number) =>
    apiPost<Psd2TppRegistration>(`/api/v1/integration/psd2/tpp/${tppId}/activate`),

  /** POST /v1/integration/psd2/tpp/{tppId}/suspend */
  suspend: (tppId: number) =>
    apiPost<Psd2TppRegistration>(`/api/v1/integration/psd2/tpp/${tppId}/suspend`),

  /** GET /v1/integration/psd2/tpp/active */
  getActiveTpps: (params?: Record<string, unknown>) =>
    apiGet<Psd2TppRegistration[]>('/api/v1/integration/psd2/tpp/active', params),

  /** POST /v1/integration/psd2/sca/initiate */
  initiateSca: () =>
    apiPost<Psd2ScaSession>('/api/v1/integration/psd2/sca/initiate'),

  /** POST /v1/integration/psd2/sca/{sessionId}/finalise */
  finaliseSca: (sessionId: number) =>
    apiPost<Psd2ScaSession>(`/api/v1/integration/psd2/sca/${sessionId}/finalise`),

  /** GET /v1/integration/psd2/sca/customer/{customerId} */
  getCustomerSessions: (customerId: number) =>
    apiGet<Psd2ScaSession[]>(`/api/v1/integration/psd2/sca/customer/${customerId}`),

  // ── Open Banking API Clients ────────────────────────────────────────────

  /** GET /v1/integration/open-banking/clients */
  getApiClients: () =>
    apiGet<ApiClientRegistration[]>('/api/v1/integration/open-banking/clients').catch(() => []),

  /** POST /v1/integration/open-banking/clients */
  registerApiClient: (data: Partial<ApiClientRegistration>) =>
    apiPost<ApiClientRegistration>('/api/v1/integration/open-banking/clients', data),

  /** POST /v1/integration/open-banking/clients/{clientId}/deactivate */
  deactivateApiClient: (clientId: string) =>
    apiPost<ApiClientRegistration>(`/api/v1/integration/open-banking/clients/${clientId}/deactivate`),

  // ── Open Banking Consents ───────────────────────────────────────────────

  /** GET /v1/integration/open-banking/consents */
  getConsents: (params?: Record<string, unknown>) =>
    apiGet<OpenBankingConsent[]>('/api/v1/integration/open-banking/consents', params).catch(() => []),

  /** POST /v1/integration/open-banking/consents */
  createConsent: (data: Partial<OpenBankingConsent>) =>
    apiPost<OpenBankingConsent>('/api/v1/integration/open-banking/consents', data),

  /** POST /v1/integration/open-banking/consents/{consentId}/authorise */
  authoriseConsent: (consentId: string) =>
    apiPost<OpenBankingConsent>(`/api/v1/integration/open-banking/consents/${consentId}/authorise`),

  /** POST /v1/integration/open-banking/consents/{consentId}/revoke */
  revokeConsent: (consentId: string) =>
    apiPost<OpenBankingConsent>(`/api/v1/integration/open-banking/consents/${consentId}/revoke`),
};
