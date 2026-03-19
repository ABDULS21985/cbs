// Auto-generated from backend entities

export interface ApiConsent {
  id: number;
  consentId: string;
  clientId: string;
  customerId: number;
  consentType: string;
  permissions: string[];
  accountIds: number[];
  grantedAt: string;
  expiresAt: string;
  revokedAt: string;
  status: string;
  createdAt: string;
  version: number;
}

