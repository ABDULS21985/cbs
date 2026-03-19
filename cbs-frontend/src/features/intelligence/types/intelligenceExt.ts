// Auto-generated from backend entities

export interface CashflowForecast {
  id: number;
  forecastId: string;
  entityType: string;
  entityId: string;
  forecastDate: string;
  horizonDays: number;
  currency: string;
  projectedInflows: number;
  projectedOutflows: number;
  netPosition: number;
  confidenceLevel: number;
  lowerBound: number;
  upperBound: number;
  modelType: string;
  modelVersion: string;
  featureImportance: Record<string, unknown>;
  inflowBreakdown: Record<string, unknown>;
  outflowBreakdown: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface CustomerBehaviourEvent {
  id: number;
  customerId: number;
  eventType: string;
  channel: string;
  sessionId: string;
  eventData: Record<string, unknown>;
  deviceType: string;
  geoLocation: string;
  createdAt: string;
}

export interface DashboardDefinition {
  id: number;
  dashboardCode: string;
  dashboardName: string;
  dashboardType: string;
  layoutConfig: Record<string, unknown>;
  refreshIntervalSec: number;
  allowedRoles: string[];
  isDefault: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardWidget {
  id: number;
  dashboardId: number;
  widgetCode: string;
  widgetType: string;
  title: string;
  dataSource: string;
  queryConfig: Record<string, unknown>;
  displayConfig: Record<string, unknown>;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  refreshOverrideSec: number;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentProcessingJob {
  id: number;
  jobId: string;
  documentId: number;
  documentType: string;
  processingType: string;
  inputFormat: string;
  extractedData: Record<string, unknown>;
  confidenceScore: number;
  verificationStatus: string;
  flags: string[];
  processingTimeMs: number;
  modelUsed: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt?: string;
}

