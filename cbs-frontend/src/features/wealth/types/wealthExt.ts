// Auto-generated from backend entities

export interface WealthManagementPlan {
  id: number;
  planCode: string;
  customerId: number;
  planType: string;
  advisorId: string;
  totalNetWorth: number;
  totalInvestableAssets: number;
  annualIncome: number;
  taxBracketPct: number;
  retirementTargetAge: number;
  retirementIncomeGoal: number;
  financialGoals: Record<string, unknown>[];
  recommendedAllocation: Record<string, unknown>;
  insuranceNeeds: Record<string, unknown>;
  estatePlanSummary: string;
  taxStrategy: string;
  nextReviewDate: string;
  status: string;
}

