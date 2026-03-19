// Auto-generated from backend entities

export interface ClientRiskProfile {
  id: number;
  profileCode: string;
  customerId: number;
  profileDate: string;
  investmentObjective: string;
  riskTolerance: string;
  investmentHorizon: string;
  annualIncome: number;
  netWorth: number;
  liquidNetWorth: number;
  investmentExperience: string;
  instrumentExperience: string;
  knowledgeAssessmentScore: number;
  concentrationLimits: string;
  maxSingleInvestmentPct: number;
  derivativesApproved: boolean;
  leverageApproved: boolean;
  maxLeverageRatio: number;
  assessedBy: string;
  nextReviewDate: string;
  regulatoryBasis: string;
  status: string;
}

export interface SuitabilityCheck {
  id: number;
  checkRef: string;
  customerId: number;
  profileId: number;
  checkType: string;
  instrumentType: string;
  instrumentCode: string;
  instrumentRiskRating: string;
  proposedAmount: number;
  proposedPctOfPortfolio: number;
  proposedPctOfNetWorth: number;
  riskToleranceMatch: boolean;
  experienceMatch: boolean;
  concentrationCheck: boolean;
  liquidityCheck: boolean;
  knowledgeCheck: boolean;
  leverageCheck: boolean;
  overallResult: string;
  warningMessages: string;
  rejectionReasons: string;
  overrideApplied: boolean;
  overrideJustification: string;
  overrideApprovedBy: string;
  regulatoryDisclosure: string;
  clientAcknowledged: boolean;
  clientAcknowledgedAt: string;
  checkedAt: string;
  createdBy: string;
  createdAt: string;
}

