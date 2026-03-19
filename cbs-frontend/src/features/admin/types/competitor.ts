// Auto-generated from backend entities

export interface CompetitorProfile {
  id: number;
  profileCode: string;
  competitorName: string;
  competitorType: string;
  country: string;
  totalAssets: number;
  totalDeposits: number;
  totalLoans: number;
  branchCount: number;
  customerCount: number;
  marketSharePct: number;
  keyProducts: Record<string, unknown>;
  pricingIntelligence: Record<string, unknown>;
  digitalCapabilities: Record<string, unknown>;
  strengths: Record<string, unknown>;
  weaknesses: Record<string, unknown>;
  threatLevel: string;
  strategicResponse: string;
  lastUpdatedDate?: string;
  status: string;
}

