// Auto-generated from backend entities

export interface ProductDeployment {
  id: number;
  deploymentCode: string;
  productCode: string;
  productName: string;
  deploymentType: string;
  targetChannels: string[];
  targetBranches: string[];
  targetRegions: string[];
  plannedDate: string;
  actualDate: string;
  rollbackPlan: string;
  adoptionTarget: number;
  adoptionActual: number;
  issuesCount: number;
  approvedBy: string;
  changeRequestRef: string;
  status: string;
}

