import { apiGet, apiPost } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Psd2TppRegistration {
  id: number;
  tppId: string;
  tppName: string;
  registrationNumber: string;
  nationalCompetentAuthority: string;
  eidasCertRef: string;
  roles: string[];
  contactEmail: string;
  contactPhone: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  activatedAt?: string;
  suspendedAt?: string;
  createdAt: string;
}

export interface Psd2ScaSession {
  id: number;
  sessionId: string;
  customerId: number;
  tppId: string;
  tppName?: string;
  scopes: string[];
  redirectUri: string;
  authMethod: 'SMS_OTP' | 'PUSH' | 'BIOMETRIC' | 'HARDWARE_TOKEN';
  status: 'INITIATED' | 'PENDING_AUTH' | 'AUTHENTICATED' | 'FAILED' | 'EXPIRED';
  authCode?: string;
  initiatedAt: string;
  finalisedAt?: string;
  failureReason?: string;
  expiresAt: string;
}

// ─── API ────────────────────────────────────────────────────────────────────

export const psd2Api = {
  // TPP Registration
  listTpps: () =>
    apiGet<Psd2TppRegistration[]>('/api/v1/integration/psd2/tpp'),

  registerTpp: (data: Partial<Psd2TppRegistration>) =>
    apiPost<Psd2TppRegistration>('/api/v1/integration/psd2/tpp', data),

  activateTpp: (tppId: string) =>
    apiPost<Psd2TppRegistration>(`/api/v1/integration/psd2/tpp/${tppId}/activate`),

  suspendTpp: (tppId: string) =>
    apiPost<Psd2TppRegistration>(`/api/v1/integration/psd2/tpp/${tppId}/suspend`),

  getActiveTpps: () =>
    apiGet<Psd2TppRegistration[]>('/api/v1/integration/psd2/tpp/active'),

  // SCA
  initiateSca: (data: { customerId: number; tppId: string; scopes: string[]; redirectUri: string }) =>
    apiPost<Psd2ScaSession>('/api/v1/integration/psd2/sca/initiate', data),

  finaliseSca: (sessionId: string, data: { authCode: string; state: string }) =>
    apiPost<Psd2ScaSession>(`/api/v1/integration/psd2/sca/${sessionId}/finalise`, data),

  getCustomerScaSessions: (customerId: number) =>
    apiGet<Psd2ScaSession[]>(`/api/v1/integration/psd2/sca/customer/${customerId}`),
};
