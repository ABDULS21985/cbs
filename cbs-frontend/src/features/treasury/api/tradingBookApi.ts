import { apiGet } from '@/lib/api';
import type { TradingBookSnapshot } from '../types/tradingBook';

export const tradingBooksApi = {
  /** GET /v1/trading-books/{id}/history */
  getBookHistory: (id: number) =>
    apiGet<TradingBookSnapshot[]>(`/api/v1/trading-books/${id}/history`),

};
