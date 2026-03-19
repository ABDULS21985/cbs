// Auto-generated from backend entities

export interface PartyRoutingProfile {
  id: number;
  customerId: number;
  preferredChannel: string;
  preferredLanguage: string;
  preferredBranchId: number;
  assignedRmId: string;
  contactPreferences: Record<string, boolean>;
  marketingConsent: boolean;
  dataSharingConsent: boolean;
  riskProfile: string;
  serviceTier: string;
  specialHandling: Record<string, boolean>;
  createdAt: string;
  updatedAt?: string;
}

