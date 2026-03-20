// Auto-generated from backend entities

export interface ProductTemplate {
  id: number;
  templateCode: string;
  templateName: string;
  productCategory: string;
  interestConfig: Record<string, unknown>;
  feeConfig: Record<string, unknown>;
  limitConfig: Record<string, unknown>;
  eligibilityRules: Record<string, unknown>[];
  lifecycleRules: Record<string, unknown>;
  glMapping: Record<string, unknown>;
  status: string;
  approvedBy: string;
  approvedAt: string;
  activatedAt: string;
  templateVersion: number;
  parentTemplateId: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  version: number;
}

