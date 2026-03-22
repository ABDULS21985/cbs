import { apiGet, apiPost } from '@/lib/api';
import type { Lockbox, LockboxItem } from '../types/lockbox';

export const lockboxesApi = {
  /** POST /v1/lockboxes — create a new lockbox */
  create: (data: Partial<Lockbox>) =>
    apiPost<Lockbox>('/api/v1/lockboxes', data),

  /** POST /v1/lockboxes/{number}/items — receive item into lockbox */
  receive: (number: string, data: Partial<LockboxItem>) =>
    apiPost<LockboxItem>(`/api/v1/lockboxes/${number}/items`, data),

  /** POST /v1/lockboxes/items/{itemId}/exception — mark item as exception with reason */
  exception: (itemId: number, reason: string) =>
    apiPost<LockboxItem>(`/api/v1/lockboxes/items/${itemId}/exception`, undefined, {
      params: { reason },
    }),

  /** POST /v1/lockboxes/items/{itemId}/deposit — deposit item */
  deposit: (itemId: number) =>
    apiPost<LockboxItem>(`/api/v1/lockboxes/items/${itemId}/deposit`),

  /** GET /v1/lockboxes/{number}/items — get items with optional status filter */
  items: (number: string, status?: string) =>
    apiGet<LockboxItem[]>(`/api/v1/lockboxes/${number}/items`, status ? { status } : undefined),

  /** GET /v1/lockboxes/{number}/summary — get lockbox summary */
  summary: (number: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/lockboxes/${number}/summary`),

};
