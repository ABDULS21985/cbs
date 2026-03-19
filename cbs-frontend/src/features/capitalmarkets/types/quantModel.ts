// Auto-generated from backend entities

export interface ModelBacktest {
  id: number;
  backtestRef: string;
  modelId: number;
  backtestType: string;
  testPeriodStart: string;
  testPeriodEnd: string;
  sampleSize: number;
  predictedDefaultRate: number;
  actualDefaultRate: number;
  accuracyPct: number;
  aucRoc: number;
  giniCoefficient: number;
  ksStatistic: number;
  var95Pct: number;
  var99Pct: number;
  breachCount: number;
  breachPct: number;
  resultStatus: string;
  findings: string;
  recommendations: string;
  runAt: string;
  createdAt: string;
}

export interface QuantModel {
  id: number;
  modelCode: string;
  modelName: string;
  modelType: string;
  modelCategory: string;
  methodology: string;
  modelVersion: string;
  description: string;
  developer: string;
  owner: string;
  lastValidatedAt: string;
  validationResult: string;
  validationReportRef: string;
  accuracyPct: number;
  aucRoc: number;
  giniCoefficient: number;
  ksStatistic: number;
  r2Score: number;
  mapePct: number;
  modelRiskTier: string;
  regulatoryUse: boolean;
  nextReviewDate: string;
  status: string;
}

