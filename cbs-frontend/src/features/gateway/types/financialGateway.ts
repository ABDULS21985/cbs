// Auto-generated from backend entities

export interface FinancialGateway {
  id: number;
  gatewayCode: string;
  gatewayName: string;
  gatewayType: string;
  protocol: string;
  bicCode: string;
  endpointUrl: string;
  authMethod: string;
  encryptionStandard: string;
  primaryConnection: string;
  backupConnection: string;
  connectionStatus: string;
  lastHeartbeatAt: string;
  dailyVolumeLimit: number;
  dailyValueLimit: number;
  messagesToday: number;
  valueToday: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GatewayMessage {
  id: number;
  messageRef: string;
  gatewayId: number;
  direction: string;
  messageType: string;
  messageFormat: string;
  senderBic: string;
  receiverBic: string;
  amount: number;
  currency: string;
  valueDate: string;
  validationStatus: string;
  sanctionsChecked: boolean;
  sanctionsResult: string;
  deliveryStatus: string;
  deliveryAttempts: number;
  ackReference: string;
  nackReason: string;
  queuedAt: string;
  sentAt: string;
  ackAt: string;
  processingTimeMs: number;
  createdAt: string;
}

