// Aligned with backend CardNetworkMembership entity

export type NetworkMembershipType = 'PRINCIPAL' | 'ASSOCIATE' | 'AFFILIATE' | 'PROCESSOR' | 'AGENT' | 'SPONSOR';

export interface CardNetworkMembership {
  id: number;
  network: string;
  membershipType: NetworkMembershipType;
  memberId: string;
  institutionName: string;
  binRanges: Record<string, unknown[]>;
  issuingEnabled: boolean;
  acquiringEnabled: boolean;
  settlementBic: string;
  settlementCurrency: string;
  pciDssCompliant: boolean;
  pciExpiryDate: string;
  annualFee: number;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
  createdAt: string;
}

