// Auto-generated from backend entities

export interface CardNetworkMembership {
  id: number;
  network: string;
  networkName?: string;
  membershipType: string;
  memberId: string;
  memberBankId?: string;
  institutionName: string;
  binRanges: Record<string, unknown[]>;
  binPrefix?: string;
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

