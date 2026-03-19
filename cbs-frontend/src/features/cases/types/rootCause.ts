// Auto-generated from backend entities

export interface CasePatternInsight {
  id: number;
  patternType: string;
  patternDescription: string;
  caseCount: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  affectedProducts: Record<string, unknown>;
  affectedChannels: Record<string, unknown>;
  rootCauseCategory: string;
  trendDirection: string;
  recommendedAction: string;
  priority: string;
  assignedTo: string;
  status: string;
}

export interface CaseRootCauseAnalysis {
  id: number;
  rcaCode: string;
  caseId: number;
  analysisMethod: string;
  analysisDate: string;
  analystName: string;
  problemStatement: string;
  rootCauseCategory: string;
  rootCauseSubCategory: string;
  rootCauseDescription: string;
  contributingFactors: Record<string, unknown>;
  evidenceReferences: Record<string, unknown>;
  customersAffected: number;
  financialImpact: number;
  reputationalImpact: string;
  regulatoryImplication: boolean;
  correctiveActions: Record<string, unknown>;
  preventiveActions: Record<string, unknown>;
  lessonsLearned: string;
  linkedKnowledgeArticleId: number;
  status: string;
}

