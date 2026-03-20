// Auto-generated from backend entities

export interface DeadLetterQueue {
  id: number;
  messageId: number;
  routeId: number;
  failureReason: string;
  originalPayload: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  status: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface IntegrationMessage {
  id: number;
  messageId: string;
  routeId: number;
  correlationId: string;
  direction: string;
  messageType: string;
  contentType: string;
  payloadHash: string;
  payloadSizeBytes: number;
  headers: Record<string, unknown>;
  status: string;
  retryCount: number;
  errorMessage: string;
  processingTimeMs: number;
  createdAt: string;
  deliveredAt: string;
}

export interface IntegrationRoute {
  id: number;
  routeCode: string;
  routeName: string;
  routeType: string;
  sourceSystem: string;
  targetSystem: string;
  protocol: string;
  endpointUrl: string;
  transformSpec: Record<string, unknown>;
  retryPolicy: Record<string, unknown>;
  circuitBreaker: Record<string, unknown>;
  rateLimitPerSec: number;
  timeoutMs: number;
  authType: string;
  authConfig: Record<string, unknown>;
  isActive: boolean;
  lastHealthCheck: string;
  healthStatus: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Iso20022CodeSet {
  id: number;
  codeSetName: string;
  code: string;
  displayName: string;
  definition: string;
  isActive: boolean;
}

export interface Iso20022Message {
  id: number;
  messageId: string;
  businessMessageId: string;
  messageDefinition: string;
  messageCategory: string;
  messageFunction: string;
  direction: string;
  senderBic: string;
  receiverBic: string;
  creationDateTime: string;
  numberOfTxns: number;
  totalAmount: number;
  currency: string;
  xmlPayload: string;
  parsedPayload: Record<string, unknown>;
  validationStatus: string;
  validationErrors: string[];
  settlementMethod: string;
  settlementDate: string;
  status: string;
  linkedTransactionId: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Psd2ScaSession {
  id: number;
  sessionId: string;
  tppId: string;
  customerId: number;
  scaMethod: string;
  scaStatus: string;
  exemptionType: string;
  paymentId: number;
  consentId: string;
  challengeData: string;
  ipAddress: string;
  userAgent: string;
  psuGeoLocation: string;
  expiresAt: string;
  createdAt: string;
  finalisedAt: string;
}

export interface Psd2TppRegistration {
  id: number;
  tppId: string;
  tppName: string;
  tppType: string;
  nationalAuthority: string;
  authorizationNumber: string;
  eidasCertificate: string;
  redirectUris: string[];
  allowedScopes: string[];
  scaApproach: string;
  status: string;
  passportingCountries: string[];
  lastCertificateCheck: string;
  certificateValid: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ── Open Banking Types ──────────────────────────────────────────────────────

export interface ApiClientRegistration {
  id: number;
  clientId: string;
  clientName: string;
  clientType: 'TPP' | 'AGGREGATOR' | 'PARTNER' | 'INTERNAL';
  apiKey?: string;
  oauthClientId?: string;
  redirectUris: string[];
  allowedScopes: string[];
  allowedEndpoints: string[];
  rateLimitPerSecond: number;
  rateLimitPerDay: number;
  dailyRequestCount: number;
  apiVersion: string;
  contactName: string;
  contactEmail: string;
  isActive: boolean;
  approvedAt: string;
  expiresAt: string;
  lastRequestReset: string;
  createdAt: string;
}

export interface OpenBankingConsent {
  id: number;
  consentId: string;
  clientId: string;
  clientName: string;
  customerId: number;
  consentType: 'AISP' | 'PISP' | 'CBPII';
  permissions: string[];
  accountIds: number[];
  status: 'AWAITING_AUTHORISATION' | 'AUTHORISED' | 'REVOKED' | 'EXPIRED';
  grantedAt?: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

