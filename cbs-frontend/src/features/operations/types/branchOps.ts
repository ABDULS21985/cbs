// Auto-generated from backend entities

export interface BranchFacility {
  id: number;
  branchId: number;
  facilityType: string;
  condition: string;
  lastInspectionDate: string;
  nextInspectionDue: string;
  maintenanceContractRef: string;
  maintenanceVendor: string;
  insurancePolicyRef: string;
  insuranceExpiry: string;
  squareFootage: number;
  capacity: number;
  accessibilityCompliant: boolean;
  fireExitCount: number;
  cctvCameraCount: number;
  facilityNotes: Record<string, unknown>;
  status: string;
}

export interface BranchQueueTicket {
  id: number;
  branchId: number;
  ticketNumber: string;
  serviceType: string;
  customerId: number;
  priority: string;
  counterNumber: string;
  servingEmployeeId: string;
  issuedAt: string;
  calledAt: string;
  servingStartedAt: string;
  completedAt?: string;
  waitTimeSeconds: number;
  serviceTimeSeconds: number;
  status: string;
  createdAt: string;
}

export interface BranchServicePlan {
  id: number;
  branchId: number;
  planPeriod: string;
  periodStart: string;
  periodEnd: string;
  targetTransactionVolume: number;
  actualTransactionVolume: number;
  targetNewAccounts: number;
  actualNewAccounts: number;
  targetCrossSell: number;
  actualCrossSell: number;
  customerSatisfactionTarget: number;
  customerSatisfactionActual: number;
  avgWaitTimeTarget: number;
  avgWaitTimeActual: number;
  avgServiceTimeTarget: number;
  avgServiceTimeActual: number;
  staffingPlan: Record<string, unknown>;
  operatingCostBudget: number;
  operatingCostActual: number;
  revenueTarget: number;
  revenueActual: number;
  status: string;
}

