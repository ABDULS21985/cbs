// Aligned with backend NotificationChannel enum and NotificationLog entity

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';

export type NotificationStatus =
  | 'PENDING'
  | 'PENDING_DISPATCH'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'BOUNCED'
  | 'OPTED_OUT';

export interface NotificationLog {
  id: number;
  templateCode: string | null;
  channel: NotificationChannel;
  eventType: string;
  customerId: number | null;
  recipientAddress: string;
  recipientName: string | null;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  provider: string | null;
  providerMessageId: string | null;
  failureReason: string | null;
  retryCount: number;
  maxRetries: number;
  scheduledAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
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
  templateCode: string;
  templateName: string;
  channel: NotificationChannel;
  eventType: string;
  subject: string | null;
  bodyTemplate: string;
  isHtml: boolean;
  locale: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  version: number;
}

/** Aligned with backend /delivery-stats response shape */
export interface DeliveryStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRatePct: number;
  failureRatePct: number;
  [key: string]: unknown;
}

/** Payload for POST /send-direct */
export interface SendDirectRequest {
  channel: NotificationChannel;
  recipientAddress: string;
  recipientName?: string;
  subject?: string;
  body: string;
  customerId?: number;
  eventType?: string;
}

/** Payload for POST /send-bulk — supports explicit recipients, broadcast, or segment */
export interface SendBulkRequest {
  recipients?: { address: string; name?: string }[];
  broadcast?: boolean;
  segmentCode?: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  eventType?: string;
  /** When provided the backend resolves this template per-recipient (merge fields). */
  templateCode?: string;
}
