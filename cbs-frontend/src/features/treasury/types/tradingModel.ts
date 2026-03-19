// Auto-generated from backend entities

export interface TradingModel {
  id: number;
  modelCode: string;
  modelName: string;
  modelPurpose: string;
  instrumentScope: string;
  methodology: string;
  modelVersion: string;
  description: string;
  inputParameters: Record<string, unknown>;
  outputMetrics: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  limitations: string;
  calibrationFrequency: string;
  lastCalibratedAt: string;
  calibrationQuality: string;
  modelOwner: string;
  developer: string;
  lastValidatedAt: string;
  validationResult: string;
  modelRiskTier: string;
  regulatoryUse: boolean;
  productionDeployedAt: string;
  performanceMetrics: Record<string, unknown>;
  nextReviewDate: string;
  status: string;
}

