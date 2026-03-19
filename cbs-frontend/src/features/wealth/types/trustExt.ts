// Auto-generated from backend entities

export interface TrustAccount {
  id: number;
  trustCode: string;
  trustName: string;
  trustType: string;
  grantorCustomerId: number;
  trusteeType: string;
  trusteeName: string;
  currency: string;
  corpusValue: number;
  incomeYtd: number;
  distributionsYtd: number;
  beneficiaries: Map<String, Object[];
  distributionRules: Record<string, unknown>;
  investmentPolicy: string;
  annualFeePct: number;
  taxId: string;
  status: string;
  inceptionDate: string;
  terminationDate: string;
}

