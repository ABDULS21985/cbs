// Auto-generated from backend entities

export interface ProductQualityAssessment {
  id: number;
  assessmentCode: string;
  productCode: string;
  productName: string;
  assessmentPeriod: string;
  periodDate: string;
  customerSatisfactionScore: number;
  complaintCount: number;
  complaintsPer1000Accounts: number;
  defectRate: number;
  processingErrorCount: number;
  slaBreachCount: number;
  slaMeetPct: number;
  avgOnboardingTimeDays: number;
  avgClaimSettlementDays: number;
  regulatoryFindingsCount: number;
  auditFindingsCount: number;
  pendingRemediations: number;
  complianceScorePct: number;
  marketSharePct: number;
  competitorBenchmarkPosition: number;
  pricingCompetitiveness: string;
  channelAvailabilityPct: number;
  straightThroughProcessingPct: number;
  manualInterventionRate: number;
  overallQualityRating: string;
  actionItems: Record<string, unknown>;
  assessedBy: string;
  status: string;
}

