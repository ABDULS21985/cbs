// Auto-generated from backend entities

export interface ChannelActivityLog {
  id: number;
  logId: string;
  customerId: number;
  sessionId: string;
  channel: string;
  activityType: string;
  activityDetail: Record<string, unknown>;
  ipAddress: string;
  deviceFingerprint: string;
  geoLocation: string;
  responseTimeMs: number;
  resultStatus: string;
  errorCode: string;
  createdAt: string;
}

export interface ChannelActivitySummary {
  id: number;
  customerId: number;
  channel: string;
  periodType: string;
  periodDate: string;
  totalSessions: number;
  totalTransactions: number;
  totalAmount: number;
  avgResponseTimeMs: number;
  failureCount: number;
  uniqueActivities: number;
  mostUsedActivity: string;
}

