// Auto-generated from backend entities

export interface WorkbenchAlert {
  id: number;
  sessionId: number;
  alertType: string;
  severity: string;
  message: string;
  detailsJson: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedAt: string;
  actionTaken: string;
  createdAt: string;
}

export interface WorkbenchQuickAction {
  id: number;
  actionCode: string;
  actionName: string;
  actionCategory: string;
  applicableWorkbenchTypes: string[];
  targetEndpoint: string;
  requiredFields: string[];
  authorizationLevel: string;
  displayOrder: number;
  hotkey: string;
  isActive: boolean;
}

export interface WorkbenchWidget {
  id: number;
  widgetCode: string;
  widgetName: string;
  widgetType: string;
  applicableWorkbenchTypes: string[];
  displayOrder: number;
  defaultExpanded: boolean;
  dataSourceEndpoint: string;
  refreshIntervalSeconds: number;
  isRequired: boolean;
  status: string;
}

