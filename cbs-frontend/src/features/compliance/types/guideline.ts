// Auto-generated from backend entities

export interface GuidelineAssessment {
  id: number;
  assessmentCode: string;
  guidelineName: string;
  guidelineSource: string;
  guidelineReference: string;
  assessmentType: string;
  assessmentDate: string;
  assessor: string;
  totalControls: number;
  compliantControls: number;
  partiallyCompliant: number;
  nonCompliant: number;
  notApplicable: number;
  complianceScorePct: number;
  overallRating: string;
  findings: Record<string, unknown>;
  remediationPlan: Record<string, unknown>;
  nextAssessmentDate: string;
  status: string;
}

