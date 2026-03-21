// Types aligned with backend RCA entities

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
  analysisMethod: 'FIVE_WHY' | 'FISHBONE' | 'FAULT_TREE' | 'PARETO' | 'OTHER';
  analysisDate: string;
  analystName: string;
  problemStatement: string;
  rootCauseCategory: 'PROCESS' | 'SYSTEM' | 'PEOPLE' | 'THIRD_PARTY' | 'POLICY' | 'ENVIRONMENT';
  rootCauseSubCategory: string;
  rootCauseDescription: string;
  contributingFactors: Record<string, unknown>;
  evidenceReferences: Record<string, unknown>;
  customersAffected: number;
  financialImpact: number;
  reputationalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  regulatoryImplication: boolean;
  correctiveActions: Record<string, unknown>;
  preventiveActions: Record<string, unknown>;
  lessonsLearned: string;
  linkedKnowledgeArticleId?: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED';
}

export interface RcaDashboardData {
  totalAnalyses: number;
  pendingAnalyses: number;
  completedAnalyses: number;
  validatedAnalyses: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  avgDaysToComplete: number;
  totalCasesWithRca: number;
  financialImpactTotal: number;
}

export interface RecurringRootCause {
  category: string;
  subCategory?: string;
  occurrenceCount: number;
  affectedCases: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  firstSeen: string;
  lastSeen: string;
  avgResolutionDays?: number;
}

export interface CorrectiveActionPayload {
  action: string;
  owner: string;
  dueDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

