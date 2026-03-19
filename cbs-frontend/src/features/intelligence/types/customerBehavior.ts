// Auto-generated from backend entities

export interface CustomerBehaviorModel {
  id: number;
  modelCode: string;
  customerId: number;
  modelType: string;
  modelVersion: string;
  score: number;
  scoreBand: string;
  confidencePct: number;
  inputFeatures: Record<string, unknown>;
  featureImportance: Record<string, unknown>;
  predictedOutcome: string;
  predictedProbability: number;
  recommendedAction: string;
  recommendedProducts: Record<string, unknown>;
  scoredAt: string;
  validUntil: string;
  isCurrent: boolean;
}

