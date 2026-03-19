// Auto-generated from backend entities

export interface SalesPlan {
  id: number;
  planCode: string;
  planName: string;
  planPeriod: string;
  periodStart: string;
  periodEnd: string;
  region: string;
  branchId: number;
  revenueTarget: number;
  revenueActual: number;
  newCustomerTarget: number;
  newCustomerActual: number;
  productTargets: Record<string, unknown>;
  teamLead: string;
  teamMembers: string[];
  territoryAssignments: Map<String, Object[];
  achievementPct: number;
  status: string;
}

export interface SalesTarget {
  id: number;
  targetCode: string;
  planId: number;
  officerId: string;
  officerName: string;
  productCode: string;
  productName: string;
  targetType: string;
  currency: string;
  targetValue: number;
  actualValue: number;
  achievementPct: number;
  periodStart: string;
  periodEnd: string;
  status: string;
}

