// Auto-generated from backend entities

export interface ChannelSession {
  id: number;
  sessionId: string;
  customerId: number;
  channel: string;
  deviceId: string;
  deviceType: string;
  ipAddress: string;
  userAgent: string;
  geoLatitude: number;
  geoLongitude: number;
  startedAt: string;
  lastActivityAt: string;
  endedAt: string;
  timeoutSeconds: number;
  parentSessionId: string;
  handoffFromChannel: string;
  contextData: Record<string, unknown>;
  status: string;
  createdAt: string;
}

