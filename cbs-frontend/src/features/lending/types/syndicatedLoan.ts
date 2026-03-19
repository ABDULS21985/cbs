// Auto-generated from backend entities

export interface SyndicateDrawdown {
  id: number;
  drawdownRef: string;
  facilityId: number;
  drawdownType: string;
  amount: number;
  currency: string;
  interestPeriod: string;
  interestRate: number;
  valueDate: string;
  maturityDate: string;
  status: string;
}

export interface SyndicateParticipant {
  id: number;
  facilityId: number;
  participantName: string;
  participantBic: string;
  role: string;
  commitmentAmount: number;
  sharePct: number;
  fundedAmount: number;
  settlementAccount: string;
  status: string;
}

export interface SyndicatedLoanFacility {
  id: number;
  facilityCode: string;
  facilityName: string;
  facilityType: string;
  borrowerName: string;
  borrowerId: number;
  leadArranger: string;
  ourRole: string;
  currency: string;
  totalFacilityAmount: number;
  ourCommitment: number;
  ourSharePct: number;
  drawnAmount: number;
  undrawnAmount: number;
  baseRate: string;
  marginBps: number;
  upfrontFeePct: number;
  commitmentFeeBps: number;
  agentFee: number;
  tenorMonths: number;
  signingDate: string;
  maturityDate: string;
  repaymentSchedule: Record<string, unknown>;
  financialCovenants: Record<string, unknown>;
  status: string;
}

