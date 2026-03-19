import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { SecurityHolding, CouponEvent, FeedStatus, MoneyMarketRate, MarketOrder, TradeConfirmation, SettlementFail } from '../types/treasury';

export function useSecurityHoldings() {
  return useQuery({
    queryKey: ['treasury', 'holdings'],
    queryFn: () => apiGet<SecurityHolding[]>('/api/v1/securities-positions').catch(() => []),
  });
}

export function useCouponCalendar(days = 90) {
  return useQuery({
    queryKey: ['treasury', 'coupons', days],
    queryFn: () => apiGet<CouponEvent[]>('/api/v1/treasury/coupons', { days }).catch(() => []),
  });
}

export function useMarketDataFeeds() {
  return useQuery({
    queryKey: ['market-data', 'feeds'],
    queryFn: () => apiGet<FeedStatus[]>('/api/v1/market-data/feeds/status').catch(() => []),
    refetchInterval: 30_000, // refresh every 30s
  });
}

export function useFxRates() {
  return useQuery({
    queryKey: ['market-data', 'fx-rates'],
    queryFn: () => apiGet<any[]>('/api/v1/market-data/prices/FX').catch(() => []),
    refetchInterval: 10_000, // refresh every 10s for live rates
  });
}

export function useMoneyMarketRates() {
  return useQuery({
    queryKey: ['market-data', 'money-market'],
    queryFn: () => apiGet<MoneyMarketRate[]>('/api/v1/market-data/money-market').catch(() => []),
    refetchInterval: 30_000,
  });
}

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['treasury', 'orders', status],
    queryFn: () => apiGet<MarketOrder[]>('/api/v1/treasury/orders', status ? { status } : undefined).catch(() => []),
  });
}

export function useTradeConfirmations(status?: string) {
  return useQuery({
    queryKey: ['treasury', 'confirmations', status],
    queryFn: () => apiGet<TradeConfirmation[]>('/api/v1/treasury/confirmations', status ? { status } : undefined).catch(() => []),
  });
}

export function useSettlementFails() {
  return useQuery({
    queryKey: ['treasury', 'settlement-fails'],
    queryFn: () => apiGet<SettlementFail[]>('/api/v1/open-items/open').catch(() => []),
  });
}
