// Auto-generated from backend entities

export interface ComplianceGapAnalysis {
  id: number;
  analysisCode: string;
  assessmentId: number;
  requirementRef: string;
  requirementDescription: string;
  regulatorySource: string;
  clauseReference: string;
  currentState: string;
  targetState: string;
  gapDescription: string;
  gapSeverity: string;
  gapCategory: string;
  riskIfUnaddressed: string;
  remediationOwner: string;
  remediationDescription: string;
  remediationCost: number;
  remediationStartDate: string;
  remediationTargetDate: string;
  remediationActualDate: string;
  remediationMilestones: Record<string, unknown>;
  evidenceRefs: Record<string, unknown>;
  verifiedBy: string;
  verifiedAt: string;
  status: string;
}

