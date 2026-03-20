// Auto-generated from backend entities

export interface BusinessRiskAssessment {
  id: number;
  assessmentCode: string;
  assessmentName: string;
  riskDomain: string;
  assessmentDate: string;
  assessor: string;
  inherentRiskScore: number;
  controlEffectiveness: string;
  residualRiskScore: number;
  riskRating: string;
  riskAppetiteStatus: string;
  description: string;
  keyRiskIndicators: Record<string, unknown>[];
  riskDrivers: string[];
  mitigationActions: Record<string, unknown>[];
  impactAssessment: Record<string, unknown>;
  nextReviewDate: string;
  status: string;
}

