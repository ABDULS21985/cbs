// Auto-generated from backend entities

export interface ParameterAudit {
  id: number;
  parameterId: number;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changeReason: string;
  createdAt: string;
}

export interface SystemParameter {
  id: number;
  paramKey: string;
  paramCategory: string;
  paramValue: string;
  valueType: string;
  description: string;
  effectiveFrom: string;
  effectiveTo: string;
  tenantId: number;
  branchId: number;
  isEncrypted: boolean;
  isActive: boolean;
  lastModifiedBy: string;
  approvalStatus: string;
  approvedBy: string;
  createdAt: string;
  updatedAt?: string;
}

