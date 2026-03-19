import { apiGet, apiPost } from '@/lib/api';
import type { DomainEvent, EventSubscription } from '../types/event';

export const eventsApi = {
  /** POST /v1/events/publish */
  publish: (data: Record<string, unknown>) =>
    apiPost<DomainEvent>('/api/v1/events/publish', data),

  /** POST /v1/events/outbox/process */
  processOutbox: () =>
    apiPost<Record<string, unknown>>('/api/v1/events/outbox/process'),

  /** GET /v1/events/replay/{aggregateType}/{aggregateId} */
  replay: (aggregateType: string, aggregateId: number) =>
    apiGet<DomainEvent[]>(`/api/v1/events/replay/${aggregateType}/${aggregateId}`),

  /** POST /v1/events/subscriptions */
  createSubscription: (data: Partial<EventSubscription>) =>
    apiPost<EventSubscription>('/api/v1/events/subscriptions', data),

  /** GET /v1/events/subscriptions */
  getSubscriptions: (params?: Record<string, unknown>) =>
    apiGet<EventSubscription[]>('/api/v1/events/subscriptions', params),

};
