// Auto-generated from backend entities

export interface EclCalculation {
  id: number;
  calculationDate: string;
  loanAccountId: number;
  customerId: number;
  currentStage: number;
  previousStage: number;
  stageReason: string;
  ead: number;
  pdUsed: number;
  lgdUsed: number;
  eclBase: number;
  eclOptimistic: number;
  eclPessimistic: number;
  eclWeighted: number;
  previousEcl: number;
  eclMovement: number;
  segment: string;
  productCode: string;
  daysPastDue: number;
  createdAt: string;
  version: number;
}

export interface EclModelParameter {
  id: number;
  parameterName: string;
  segment: string;
  stage: number;
  pd12Month: number;
  pdLifetime: number;
  lgdRate: number;
  eadCcf: number;
  macroScenario: string;
  scenarioWeight: number;
  macroAdjustment: number;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  version: number;
}

