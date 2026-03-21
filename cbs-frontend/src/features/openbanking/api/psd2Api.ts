import api, { apiGet } from '@/lib/api';
import type { ApiResponse } from '@/types/common';

// ─── Backend Entity Types (matching Java entity field names) ─────────────────

interface BackendPsd2Tpp {
  id: number;
  tppId: string;
  tppName: string;
  tppType: string; // AISP | PISP | CBPII | ASPSP
  nationalAuthority: string;
  authorizationNumber: string;
  eidasCertificate: string;
  redirectUris: string[];
  allowedScopes: string[];
  scaApproach: string; // REDIRECT | EMBEDDED | DECOUPLED | OAUTH2
  status: string; // PENDING | ACTIVE | SUSPENDED | REVOKED
  passportingCountries: string[];
  lastCertificateCheck: string | null;
  certificateValid: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackendPsd2ScaSession {
  id: number;
  sessionId: string;
  tppId: string;
  customerId: number;
  scaMethod: string; // SMS_OTP | PUSH | BIOMETRIC | TOTP | FIDO2 | PHOTO_TAN | CHIP_TAN
  scaStatus: string; // STARTED | AUTHENTICATION_REQUIRED | METHOD_SELECTED | FINALISED | FAILED | EXEMPTED
  exemptionType: string | null;
  paymentId: number | null;
  consentId: string | null;
  challengeData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  psuGeoLocation: string | null;
  expiresAt: string;
  createdAt: string;
  finalisedAt: string | null;
}

// ─── Frontend Types ──────────────────────────────────────────────────────────

export type Psd2TppStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
export type Psd2TppType = 'AISP' | 'PISP' | 'CBPII' | 'ASPSP';
export type ScaMethod = 'SMS_OTP' | 'PUSH' | 'BIOMETRIC' | 'TOTP' | 'FIDO2' | 'PHOTO_TAN' | 'CHIP_TAN';
export type ScaStatus = 'STARTED' | 'AUTHENTICATION_REQUIRED' | 'METHOD_SELECTED' | 'FINALISED' | 'FAILED' | 'EXEMPTED';

export interface Psd2TppRegistration {
  id: number;
  tppId: string;
  tppName: string;
  tppType: Psd2TppType;
  nationalAuthority: string;
  authorizationNumber: string;
  eidasCertificate: string;
  redirectUris: string[];
  allowedScopes: string[];
  scaApproach: string;
  status: Psd2TppStatus;
  passportingCountries: string[];
  lastCertificateCheck: string | null;
  certificateValid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Psd2ScaSession {
  id: number;
  sessionId: string;
  tppId: string;
  customerId: number;
  scaMethod: ScaMethod;
  scaStatus: ScaStatus;
  exemptionType: string | null;
  paymentId: number | null;
  consentId: string | null;
  challengeData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  psuGeoLocation: string | null;
  expiresAt: string;
  createdAt: string;
  finalisedAt: string | null;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapTpp(raw: BackendPsd2Tpp): Psd2TppRegistration {
  return {
    id: raw.id,
    tppId: raw.tppId,
    tppName: raw.tppName,
    tppType: (raw.tppType ?? 'AISP') as Psd2TppType,
    nationalAuthority: raw.nationalAuthority ?? '',
    authorizationNumber: raw.authorizationNumber ?? '',
    eidasCertificate: raw.eidasCertificate ?? '',
    redirectUris: raw.redirectUris ?? [],
    allowedScopes: raw.allowedScopes ?? [],
    scaApproach: raw.scaApproach ?? 'REDIRECT',
    status: (raw.status ?? 'PENDING') as Psd2TppStatus,
    passportingCountries: raw.passportingCountries ?? [],
    lastCertificateCheck: raw.lastCertificateCheck,
    certificateValid: raw.certificateValid ?? true,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapScaSession(raw: BackendPsd2ScaSession): Psd2ScaSession {
  return {
    id: raw.id,
    sessionId: raw.sessionId,
    tppId: raw.tppId,
    customerId: raw.customerId,
    scaMethod: (raw.scaMethod ?? 'SMS_OTP') as ScaMethod,
    scaStatus: (raw.scaStatus ?? 'STARTED') as ScaStatus,
    exemptionType: raw.exemptionType,
    paymentId: raw.paymentId,
    consentId: raw.consentId,
    challengeData: raw.challengeData,
    ipAddress: raw.ipAddress,
    userAgent: raw.userAgent,
    psuGeoLocation: raw.psuGeoLocation,
    expiresAt: raw.expiresAt,
    createdAt: raw.createdAt,
    finalisedAt: raw.finalisedAt,
  };
}

// ─── API ────────────────────────────────────────────────────────────────────

export const psd2Api = {
  // TPP Registration
  listTpps: () =>
    apiGet<BackendPsd2Tpp[]>('/api/v1/integration/psd2/tpp').then((data) => data.map(mapTpp)),

  registerTpp: (data: {
    tppName: string;
    tppType: string;
    nationalAuthority: string;
    authorizationNumber: string;
    eidasCertificate?: string;
    allowedScopes?: string[];
    scaApproach?: string;
  }) =>
    apiGet<BackendPsd2Tpp>('/api/v1/integration/psd2/tpp').then(() =>
      // POST with body — entity is accepted as @RequestBody
      api
        .post<ApiResponse<BackendPsd2Tpp>>('/api/v1/integration/psd2/tpp', {
          tppId: `TPP-${Date.now().toString(36).toUpperCase()}`,
          tppName: data.tppName,
          tppType: data.tppType,
          nationalAuthority: data.nationalAuthority,
          authorizationNumber: data.authorizationNumber,
          eidasCertificate: data.eidasCertificate ?? '',
          allowedScopes: data.allowedScopes ?? [],
          scaApproach: data.scaApproach ?? 'REDIRECT',
          status: 'PENDING',
        })
        .then((res) => mapTpp(res.data.data)),
    ),

  activateTpp: (tppId: string) =>
    api
      .post<ApiResponse<BackendPsd2Tpp>>(`/api/v1/integration/psd2/tpp/${tppId}/activate`)
      .then((res) => mapTpp(res.data.data)),

  suspendTpp: (tppId: string) =>
    api
      .post<ApiResponse<BackendPsd2Tpp>>(`/api/v1/integration/psd2/tpp/${tppId}/suspend`)
      .then((res) => mapTpp(res.data.data)),

  getActiveTpps: () =>
    apiGet<BackendPsd2Tpp[]>('/api/v1/integration/psd2/tpp/active').then((data) =>
      data.map(mapTpp),
    ),

  // SCA — backend uses @RequestParam, not @RequestBody
  initiateSca: (params: {
    tppId: string;
    customerId: number;
    scaMethod: string;
    paymentId?: number;
    consentId?: string;
    amount?: number;
  }) =>
    api
      .post<ApiResponse<BackendPsd2ScaSession>>(
        '/api/v1/integration/psd2/sca/initiate',
        undefined,
        { params },
      )
      .then((res) => mapScaSession(res.data.data)),

  finaliseSca: (sessionId: string, success: boolean) =>
    api
      .post<ApiResponse<BackendPsd2ScaSession>>(
        `/api/v1/integration/psd2/sca/${sessionId}/finalise`,
        undefined,
        { params: { success } },
      )
      .then((res) => mapScaSession(res.data.data)),

  getCustomerScaSessions: (customerId: number) =>
    apiGet<BackendPsd2ScaSession[]>(
      `/api/v1/integration/psd2/sca/customer/${customerId}`,
    ).then((data) => data.map(mapScaSession)),
};
