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
  keyRiskIndicators: Map<String, Object[];
  riskDrivers: string[];
  mitigationActions: Map<String, Object[];
  impactAssessment: Record<string, unknown>;
  nextReviewDate: string;
  status: string;
}

