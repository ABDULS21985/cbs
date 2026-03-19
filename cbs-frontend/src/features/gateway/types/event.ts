// Auto-generated from backend entities

export interface DomainEvent {
  id: number;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sequenceNumber: number;
  published: boolean;
  publishedAt: string;
  topic: string;
  createdAt: string;
}

export interface EventSubscription {
  id: number;
  subscriptionName: string;
  eventTypes: string[];
  deliveryType: string;
  deliveryUrl: string;
  deliveryConfig: Record<string, unknown>;
  filterExpression: string;
  isActive: boolean;
  lastDeliveredEventId: number;
  failureCount: number;
  maxRetries: number;
  createdAt: string;
  version: number;
}

