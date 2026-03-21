import { apiGet, apiPost } from '@/lib/api';
import type { SecurityHolding, CouponEvent, FxRate, MoneyMarketRate, FeedStatus, MarketOrder, Execution, TradeConfirmation, SettlementFail } from '../types/treasury';

export const treasuryApi = {
  // Fixed Income
  getHoldings: () => apiGet<SecurityHolding[]>('/api/v1/treasury/fixed-income/holdings'),
  getCouponCalendar: (days?: number) => apiGet<CouponEvent[]>('/api/v1/treasury/fixed-income/coupons', { days }),

  // Market Data
  getFxRates: () => apiGet<FxRate[]>('/api/v1/fx/rate'),
  getMoneyMarketRates: () => apiGet<MoneyMarketRate[]>('/api/v1/market-data/money-market'),
  getFeedStatus: () => apiGet<FeedStatus[]>('/api/v1/market-data/feeds/status'),
  getPriceHistory: (instrumentCode: string, days: number) => apiGet<{ date: string; close: number }[]>(`/api/v1/market-data/prices/${instrumentCode}`, { days }),

  // Orders
  getOrders: (status?: string) => apiGet<MarketOrder[]>('/api/v1/treasury/orders', { status }),
  submitOrder: (order: Partial<MarketOrder>) => apiPost<MarketOrder>('/api/v1/treasury/orders', order),
  cancelOrder: (id: number) => apiPost<void>(`/api/v1/treasury/orders/${id}/cancel`),
  getExecutions: (orderId?: number) => apiGet<Execution[]>('/api/v1/treasury/executions', { orderId }),

  // Trade Ops
  getConfirmations: (status?: string) => apiGet<TradeConfirmation[]>('/api/v1/treasury/confirmations', { status }),
  confirmTrade: (id: number) => apiPost<void>(`/api/v1/treasury/confirmations/${id}/confirm`),
  getSettlementFails: () => apiGet<SettlementFail[]>('/api/v1/treasury/settlement-fails'),
};
