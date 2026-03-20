// Auto-generated from backend entities

export type ReportCategory =
  | 'PRUDENTIAL'
  | 'STATISTICAL'
  | 'AML_CFT'
  | 'RISK'
  | 'LIQUIDITY'
  | 'CAPITAL_ADEQUACY'
  | 'CREDIT'
  | 'MARKET_RISK'
  | 'OPERATIONAL_RISK'
  | 'OTHER';

export interface RegulatoryReportDefinition {
  id: number;
  reportCode: string;
  reportName: string;
  regulator: string;
  frequency: string;
  reportCategory: ReportCategory;
  dataQuery: string;
  templateConfig: Record<string, unknown>;
  outputFormat: string;
  isActive: boolean;
}

export interface RegulatoryReportRun {
  id: number;
  reportCode: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  status: string;
  recordCount: number;
  filePath: string;
  fileSizeBytes: number;
  generationTimeMs: number;
  errorMessage: string;
  submittedBy: string;
  submittedAt: string;
  submissionRef: string;
  regulatorAckRef: string;
  generatedBy: string;
  generatedAt: string;
  createdAt: string;
  version: number;
}

