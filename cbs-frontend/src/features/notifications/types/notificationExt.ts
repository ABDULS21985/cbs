// Auto-generated from backend entities

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

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
  status: NotificationStatus;
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

export interface NotificationTemplate {
  id: number;
  code: string;
  channel: NotificationChannel;
  subject: string;
  bodyTemplate: string;
  eventType: string;
  [key: string]: unknown;
}

export interface DeliveryStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  [key: string]: unknown;
}
