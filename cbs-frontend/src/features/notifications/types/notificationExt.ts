// Auto-generated from backend entities

export interface NotificationLog {
  id: number;
  templateCode: string;
  channel: NotificationChannel;
  eventType: string;
  customerId: number;
  recipientAddress: string;
  recipientName: string;
  subject: string;
  body: string;
  status: string;
  provider: string;
  providerMessageId: string;
  failureReason: string;
  retryCount: number;
  maxRetries: number;
  scheduledAt: string;
  sentAt: string;
  deliveredAt: string;
  createdAt: string;
  version: number;
}

export interface NotificationPreference {
  id: number;
  customerId: number;
  channel: NotificationChannel;
  eventType: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

