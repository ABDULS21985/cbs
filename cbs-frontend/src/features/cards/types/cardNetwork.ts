// Auto-generated from backend entities

export interface CardNetworkMembership {
  id: number;
  network: string;
  membershipType: string;
  memberId: string;
  institutionName: string;
  binRanges: Map<String, Object[];
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

