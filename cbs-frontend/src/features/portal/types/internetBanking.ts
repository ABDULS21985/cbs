// Auto-generated from backend entities

export interface InternetBankingFeature {
  id: number;
  featureCode: string;
  featureName: string;
  featureCategory: string;
  description: string;
  requiresMfa: boolean;
  requiresSca: boolean;
  dailyLimit: number;
  isEnabled: boolean;
  allowedSegments: string[];
  createdAt: string;
}

export interface InternetBankingSession {
  id: number;
  sessionId: string;
  customerId: number;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  loginMethod: string;
  mfaCompleted?: boolean;
  sessionStatus: string;
  lastActivityAt: string;
  idleTimeoutMin: number;
  absoluteTimeoutMin: number;
  loginAt: string;
  logoutAt: string;
  createdAt: string;
}

