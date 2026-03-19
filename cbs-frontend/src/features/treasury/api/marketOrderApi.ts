import { apiGet, apiPost } from '@/lib/api';
import type { MarketOrder } from '../types/marketOrder';

export const marketOrdersApi = {
  /** POST /v1/market-orders/{ref}/validate */
  validateOrder: (ref: string) =>
    apiPost<MarketOrder>(`/api/v1/market-orders/${ref}/validate`),

  /** POST /v1/market-orders/{ref}/route */
  routeOrder: (ref: string) =>
    apiPost<MarketOrder>(`/api/v1/market-orders/${ref}/route`),

  /** GET /v1/market-orders/customer/{id} */
  getOrdersByCustomer: (id: number) =>
    apiGet<MarketOrder[]>(`/api/v1/market-orders/customer/${id}`),

};
