// Auto-generated from backend entities

export interface MarketDataSubscription {
  id: number;
  subscriberSystem: string;
  feedIds: Record<string, unknown>;
  instrumentFilter: Record<string, unknown>;
  deliveryMethod: string;
  deliveryFrequency: string;
  format: string;
  lastDeliveredAt: string;
  deliveryFailureCount: number;
  isActive: boolean;
}

