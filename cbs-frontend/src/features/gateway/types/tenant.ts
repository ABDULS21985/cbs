// Auto-generated from backend entities

export interface Tenant {
  id: number;
  tenantCode: string;
  tenantName: string;
  tenantType: string;
  isolationMode: string;
  schemaName: string;
  brandingConfig: Record<string, unknown>;
  maxCustomers: number;
  maxAccounts: number;
  maxUsers: number;
  isActive: boolean;
  licenseExpiresAt: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

