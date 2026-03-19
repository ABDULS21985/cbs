// Auto-generated from backend entities

export interface MarketAnalysisReport {
  id: number;
  reportCode: string;
  reportName: string;
  analysisType: string;
  region: string;
  analysisDate: string;
  analyst: string;
  executiveSummary: string;
  keyFindings: Record<string, unknown>;
  dataPoints: Record<string, unknown>;
  forecasts: Record<string, unknown>;
  riskFactors: Record<string, unknown>;
  recommendations: Record<string, unknown>;
  dataSources: Record<string, unknown>;
  confidenceLevel: string;
  timeHorizon: string;
  status: string;
  publishedAt: string;
}

