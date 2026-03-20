import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { SecurityHolding, CouponEvent, FeedStatus, MoneyMarketRate, MarketOrder, TradeConfirmation, SettlementFail } from '../types/treasury';

export function useSecurityHoldings() {
  return useQuery({
    queryKey: ['treasury', 'holdings'],
    queryFn: () => apiGet<SecurityHolding[]>('/api/v1/securities-positions'),
  });
}

export function useCouponCalendar(days = 90) {
  return useQuery({
    queryKey: ['treasury', 'coupons', days],
    queryFn: () => apiGet<CouponEvent[]>('/api/v1/treasury/coupons', { days }),
  });
}

export function useMarketDataFeeds() {
  return useQuery({
    queryKey: ['market-data', 'feeds'],
    queryFn: () => apiGet<FeedStatus[]>('/api/v1/market-data/feeds/status'),
    refetchInterval: 30_000, // refresh every 30s
  });
}

export function useFxRates() {
  return useQuery({
    queryKey: ['market-data', 'fx-rates'],
    queryFn: () => apiGet<any[]>('/api/v1/market-data/prices/FX'),
    refetchInterval: 10_000, // refresh every 10s for live rates
  });
}

export function useMoneyMarketRates() {
  return useQuery({
    queryKey: ['market-data', 'money-market'],
    queryFn: () => apiGet<MoneyMarketRate[]>('/api/v1/market-data/money-market'),
    refetchInterval: 30_000,
  });
}

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['treasury', 'orders', status],
    queryFn: async () => {
      const orders = await apiGet<Array<{
        id: string;
        orderRef: string;
        instrument: string;
        instrumentName: string;
        side: 'BUY' | 'SELL';
        quantity: number;
        price: number | null;
        orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
        filledQuantity: number;
        avgFillPrice: number | null;
        deskId: string;
        deskName?: string;
        status: string;
        createdAt: string;
      }>>('/api/v1/treasury/orders', status ? { status } : undefined);

      return orders.map((order) => ({
        id: Number(order.id),
        orderRef: order.orderRef,
        orderType: order.orderType,
        direction: order.side,
        instrument: order.instrument,
        instrumentName: order.instrumentName,
        quantity: order.quantity,
        price: order.price,
        filledQuantity: order.filledQuantity,
        avgFillPrice: order.avgFillPrice,
        timeInForce: 'DAY',
        status: (order.status === 'VALIDATED' || order.status === 'ROUTED') ? 'NEW' : order.status as MarketOrder['status'],
        createdAt: order.createdAt,
        account: order.deskName ?? order.deskId,
      }));
    },
  });
}

export function useTradeConfirmations(status?: string) {
  return useQuery({
    queryKey: ['treasury', 'confirmations', status],
    queryFn: () => apiGet<TradeConfirmation[]>('/api/v1/treasury/confirmations', status ? { status } : undefined),
  });
}

export function useSettlementFails() {
  return useQuery({
    queryKey: ['treasury', 'settlement-fails'],
    queryFn: () => apiGet<SettlementFail[]>('/api/v1/open-items/open'),
  });
}
