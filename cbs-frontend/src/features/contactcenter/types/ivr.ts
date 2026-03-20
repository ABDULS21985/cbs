// Auto-generated from backend entities

export interface IvrMenu {
  id: number;
  menuCode: string;
  menuName: string;
  language: string;
  parentMenuId: number;
  menuLevel: number;
  promptText: string;
  promptAudioRef: string;
  inputType: string;
  options: Record<string, unknown>[];
  timeoutSeconds: number;
  maxRetries: number;
  isActive: boolean;
  createdAt: string;
}

export interface IvrSession {
  id: number;
  sessionId: string;
  callerNumber: string;
  customerId: number;
  language: string;
  currentMenuId: number;
  navigationPath: string[];
  authenticated: boolean;
  selfServiceCompleted?: boolean;
  transferredToAgent: boolean;
  transferReason: string;
  durationSec: number;
  status: string;
  startedAt: string;
  endedAt: string;
}

