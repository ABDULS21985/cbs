import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { CouponEvent, FeedStatus, MoneyMarketRate, MarketOrder, TradeConfirmation, SettlementFail } from '../types/treasury';
import type { SecurityHolding } from '../types/fixedIncome';

export function useSecurityHoldings() {
  return useQuery({
    queryKey: ['treasury', 'holdings'],
    // Correct path: GET /v1/fixed-income/holdings (FixedIncomeController)
    queryFn: () => apiGet<SecurityHolding[]>('/api/v1/fixed-income/holdings'),
  });
}

export function useCouponCalendar(days = 90) {
  return useQuery({
    queryKey: ['treasury', 'coupons', days],
    queryFn: async (): Promise<CouponEvent[]> => {
      // Backend returns CouponPayment entities (holdingId, couponDate, couponAmount, currencyCode, status)
      const raw = await apiGet<any[]>('/api/v1/treasury/fixed-income/coupons', { size: 100 });
      return (Array.isArray(raw) ? raw : []).map((cp) => ({
        id: cp.id ?? 0,
        securityName: cp.securityName ?? `Holding #${cp.holdingId ?? '?'}`,
        isin: cp.isin ?? '',
        eventType: (cp.eventType ?? 'COUPON') as CouponEvent['eventType'],
        eventDate: cp.couponDate ?? cp.eventDate ?? '',
        amount: Number(cp.couponAmount ?? cp.amount ?? 0),
        currency: cp.currencyCode ?? cp.currency ?? '',
        status: (cp.status === 'PROJECTED' ? 'PENDING' : cp.status ?? 'PENDING') as CouponEvent['status'],
      }));
    },
  });
}

export function useMarketDataFeeds() {
  return useQuery({
    queryKey: ['market-data', 'feeds'],
    queryFn: async (): Promise<FeedStatus[]> => {
      const raw = await apiGet<any[]>('/api/v1/market-data/feeds/status');
      return (Array.isArray(raw) ? raw : []).map((f) => {
        const lastUpdateAt: string | null = f.lastUpdateAt ?? null;
        const lastUpdateSecondsAgo = lastUpdateAt
          ? Math.max(0, Math.floor((Date.now() - new Date(lastUpdateAt).getTime()) / 1000))
          : 9999;
        const recordsToday: number = f.recordsToday ?? 0;
        const recordsPerHour = Math.round(recordsToday / 24);
        const errorCount: number = f.errorCountToday ?? f.errorCount ?? 0;
        const qualityScore = errorCount === 0 && recordsToday > 0
          ? 95
          : errorCount > 10 ? 40
          : recordsToday === 0 ? 20
          : Math.max(50, 90 - errorCount * 5);
        return {
          feedCode: f.feedCode ?? '',
          feedName: f.feedName ?? '',
          provider: f.provider ?? '',
          status: (f.status ?? (f.isActive ? 'ONLINE' : 'OFFLINE')) as FeedStatus['status'],
          latencyMs: f.latencyMs ?? 0,
          recordsPerHour,
          errorCount,
          lastUpdateSecondsAgo,
          qualityScore,
        };
      });
    },
    refetchInterval: 30_000,
  });
}

export function useFxRates() {
  return useQuery({
    queryKey: ['market-data', 'fx-rates'],
    queryFn: async () => {
      const raw = await apiGet<any[]>('/api/v1/fx/rate');
      return (Array.isArray(raw) ? raw : []).map((r) => ({
        pair: `${r.sourceCurrency ?? ''}/${r.targetCurrency ?? ''}`,
        bid: Number(r.buyRate ?? 0),
        ask: Number(r.sellRate ?? 0),
        mid: Number(r.midRate ?? 0),
        change: 0,
        changeDirection: 'flat' as const,
        lastUpdated: r.createdAt ?? (r.rateDate ? `${r.rateDate}T00:00:00Z` : new Date().toISOString()),
      }));
    },
    refetchInterval: 10_000,
  });
}

export function useMoneyMarketRates() {
  return useQuery({
    queryKey: ['market-data', 'money-market'],
    queryFn: async (): Promise<MoneyMarketRate[]> => {
      const raw = await apiGet<any[]>('/api/v1/market-data/money-market');
      return (Array.isArray(raw) ? raw : []).map((r) => ({
        instrument: r.instrumentCode ?? r.instrument ?? '',
        bid: Number(r.price ?? r.bid ?? 0),
        offer: Number(r.price ?? r.offer ?? 0),
        mid: Number(r.price ?? r.mid ?? 0),
        change: Number(r.change ?? 0),
        changeDirection: (r.changeDirection ?? 'flat') as MoneyMarketRate['changeDirection'],
      }));
    },
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

      return orders.map((order): MarketOrder => ({
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
        timeInForce: 'DAY' as const,
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
    queryFn: async (): Promise<SettlementFail[]> => {
      const raw = await apiGet<any[]>('/api/v1/treasury/settlement-fails');
      return (Array.isArray(raw) ? raw : []).map((f) => ({
        id: f.id ?? 0,
        failRef: f.failRef ?? '',
        instructionRef: f.settlementInstructionId != null ? String(f.settlementInstructionId) : (f.instructionRef ?? ''),
        instrument: f.instrumentName ?? f.instrumentCode ?? f.instrument ?? '',
        amount: Number(f.amount ?? 0),
        counterparty: f.counterpartyName ?? f.counterpartyCode ?? f.counterparty ?? '',
        failSince: f.failStartDate ?? f.failSince ?? '',
        agingDays: f.agingDays ?? 0,
        penaltyAccrued: Number(f.penaltyAccrued ?? 0),
        escalation: f.escalationLevel ?? f.escalation ?? '',
        status: (f.status ?? 'OPEN') as SettlementFail['status'],
      }));
    },
  });
}
