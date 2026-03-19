// Auto-generated from backend entities

export interface DataExportJob {
  id: number;
  jobName: string;
  sourceEntity: string;
  exportFormat: string;
  scheduleCron: string;
  lastRunAt: string;
  nextRunAt: string;
  dateColumn: string;
  lastExportedDate: string;
  incremental: boolean;
  destinationType: string;
  destinationPath: string;
  destinationConfig: Record<string, unknown>;
  status: string;
  lastRecordCount: number;
  lastFileSizeBytes: number;
  lastDurationMs: number;
  errorMessage: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

