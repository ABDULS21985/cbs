// Auto-generated from backend entities

export interface SyndicateArrangement {
  id: number;
  syndicateCode: string;
  syndicateName: string;
  syndicateType: string;
  leadArranger: string;
  totalFacilityAmount: number;
  currency: string;
  ourCommitment: number;
  ourSharePct: number;
  participants: Record<string, unknown>[];
  borrowerName: string;
  purpose: string;
  tenorMonths: number;
  pricing: Record<string, unknown>;
  status: string;
  signingDate: string;
  maturityDate: string;
}

