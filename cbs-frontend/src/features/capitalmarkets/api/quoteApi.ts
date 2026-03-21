import { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { PriceQuote, QuoteRequest } from '../types/quote';

export const quotesApi = {
  /** POST /v1/quotes/requests */
  submitRequest: (data: Partial<QuoteRequest>) =>
    apiPost<QuoteRequest>('/api/v1/quotes/requests', data),

  /** POST /v1/quotes/generate — backend expects @RequestParam requestId + @RequestBody PriceQuote */
  generateQuote: (requestId: number, data: Partial<PriceQuote>) =>
    apiPost<PriceQuote>(`/api/v1/quotes/generate?requestId=${requestId}`, data),

  /** POST /v1/quotes/{id}/accept */
  acceptQuote: (id: number) =>
    apiPost<PriceQuote>(`/api/v1/quotes/${id}/accept`),

  /** POST /v1/quotes/expire-stale */
  expireStaleQuotes: () =>
    apiPost<number>('/api/v1/quotes/expire-stale'),

  /** GET /v1/quotes/requests */
  getQuoteRequests: (params?: Record<string, unknown>) =>
    apiGet<QuoteRequest[]>('/api/v1/quotes/requests', params),

  /** GET /v1/quotes/active/{deskId} */
  getActiveQuotes: (deskId: number) =>
    apiGet<PriceQuote[]>(`/api/v1/quotes/active/${deskId}`),
};
