// Auto-generated from backend entities

export interface BranchNetworkPlan {
  id: number;
  planCode: string;
  planName: string;
  planType: string;
  region: string;
  targetLocation: string;
  latitude: number;
  longitude: number;
  estimatedCost: number;
  estimatedRevenueAnnual: number;
  paybackMonths: number;
  targetCustomers: number;
  catchmentPopulation: number;
  competitiveDensity: number;
  plannedStart: string;
  plannedCompletion: string;
  actualCompletion: string;
  approvedBy: string;
  boardApprovalRef: string;
  regulatoryApprovalRef: string;
  status: string;
}

