import { apiGet, apiPost } from '@/lib/api';
import type { LockboxItem } from '../types/lockbox';

export const lockboxesApi = {
  /** POST /v1/lockboxes/{number}/items */
  receive: (number: string, data: Partial<LockboxItem>) =>
    apiPost<LockboxItem>(`/api/v1/lockboxes/${number}/items`, data),

  /** POST /v1/lockboxes/items/{itemId}/exception */
  exception: (itemId: number) =>
    apiPost<LockboxItem>(`/api/v1/lockboxes/items/${itemId}/exception`),

  /** POST /v1/lockboxes/items/{itemId}/deposit */
  deposit: (itemId: number) =>
    apiPost<LockboxItem>(`/api/v1/lockboxes/items/${itemId}/deposit`),

  /** GET /v1/lockboxes/{number}/items */
  items: (number: string) =>
    apiGet<LockboxItem[]>(`/api/v1/lockboxes/${number}/items`),

  /** GET /v1/lockboxes/{number}/summary */
  summary: (number: string) =>
    apiGet<Record<string, unknown>>(`/api/v1/lockboxes/${number}/summary`),

};
