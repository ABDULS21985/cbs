import { apiGet } from '@/lib/api';
import type { TradingBookSnapshot } from '../types/tradingBook';

export const tradingBooksApi = {
  /** GET /v1/treasury/trading-books/{id}/snapshots */
  getBookHistory: (id: number) =>
    apiGet<TradingBookSnapshot[]>(`/api/v1/treasury/trading-books/${id}/snapshots`),

};
