import type { SecurityHolding, CouponEvent, FxRate, MoneyMarketRate, FeedStatus, MarketOrder, TradeConfirmation, SettlementFail } from '../types/treasury';

export const mockHoldings: SecurityHolding[] = [
  { id: 1, holdingRef: 'SEC-001', isin: 'NGFGN2031A', securityName: 'FGN Bond 14.55% 2031', securityType: 'FGN_BOND', faceValue: 5000000000, bookValue: 4850000000, marketValue: 5125000000, couponRate: 14.55, yieldToMaturity: 13.8, maturityDate: '2031-06-15', duration: 4.2, modifiedDuration: 3.9, unrealizedPnl: 275000000, currency: 'NGN', status: 'ACTIVE' },
  { id: 2, holdingRef: 'SEC-002', isin: 'NGTB2026B', securityName: 'NTB 182-day Apr 2026', securityType: 'T_BILL', faceValue: 8000000000, bookValue: 7520000000, marketValue: 7680000000, couponRate: 0, yieldToMaturity: 18.5, maturityDate: '2026-04-25', duration: 0.3, modifiedDuration: 0.28, unrealizedPnl: 160000000, currency: 'NGN', status: 'ACTIVE' },
  { id: 3, holdingRef: 'SEC-003', isin: 'NGMTN2028A', securityName: 'MTN Nigeria 15% 2028', securityType: 'CORPORATE_BOND', faceValue: 2000000000, bookValue: 2050000000, marketValue: 1980000000, couponRate: 15.0, yieldToMaturity: 16.2, maturityDate: '2028-09-20', duration: 2.1, modifiedDuration: 1.95, unrealizedPnl: -70000000, currency: 'NGN', status: 'ACTIVE' },
  { id: 4, holdingRef: 'SEC-004', isin: 'NGSKK2029A', securityName: 'Sukuk Al-Ijarah 11.2% 2029', securityType: 'SUKUK', faceValue: 3000000000, bookValue: 2900000000, marketValue: 3050000000, couponRate: 11.2, yieldToMaturity: 10.8, maturityDate: '2029-12-15', duration: 3.1, modifiedDuration: 2.9, unrealizedPnl: 150000000, currency: 'NGN', status: 'ACTIVE' },
  { id: 5, holdingRef: 'SEC-005', isin: 'NGFGN2035A', securityName: 'FGN Bond 16.25% 2035', securityType: 'FGN_BOND', faceValue: 7500000000, bookValue: 7200000000, marketValue: 7650000000, couponRate: 16.25, yieldToMaturity: 15.1, maturityDate: '2035-03-20', duration: 6.8, modifiedDuration: 6.2, unrealizedPnl: 450000000, currency: 'NGN', status: 'ACTIVE' },
];

export const mockCoupons: CouponEvent[] = [
  { id: 1, securityName: 'FGN Bond 14.55% 2031', isin: 'NGFGN2031A', eventType: 'COUPON', eventDate: '2026-04-15', amount: 363750000, currency: 'NGN', status: 'PENDING' },
  { id: 2, securityName: 'NTB 182-day Apr 2026', isin: 'NGTB2026B', eventType: 'MATURITY', eventDate: '2026-04-25', amount: 8000000000, currency: 'NGN', status: 'PENDING' },
  { id: 3, securityName: 'MTN Nigeria 15% 2028', isin: 'NGMTN2028A', eventType: 'COUPON', eventDate: '2026-05-20', amount: 150000000, currency: 'NGN', status: 'PENDING' },
  { id: 4, securityName: 'Sukuk Al-Ijarah 11.2% 2029', isin: 'NGSKK2029A', eventType: 'COUPON', eventDate: '2026-06-15', amount: 168000000, currency: 'NGN', status: 'PENDING' },
  { id: 5, securityName: 'FGN Bond 16.25% 2035', isin: 'NGFGN2035A', eventType: 'COUPON', eventDate: '2026-06-20', amount: 609375000, currency: 'NGN', status: 'PENDING' },
];

export const mockFxRates: FxRate[] = [
  { pair: 'USD/NGN', bid: 1548.00, ask: 1552.00, mid: 1550.00, change: 0.3, changeDirection: 'up', lastUpdated: new Date().toISOString() },
  { pair: 'EUR/NGN', bid: 1676.50, ask: 1684.50, mid: 1680.50, change: -0.1, changeDirection: 'down', lastUpdated: new Date().toISOString() },
  { pair: 'GBP/NGN', bid: 1945.00, ask: 1955.00, mid: 1950.00, change: 0.2, changeDirection: 'up', lastUpdated: new Date().toISOString() },
  { pair: 'EUR/USD', bid: 1.0835, ask: 1.0845, mid: 1.0840, change: -0.05, changeDirection: 'down', lastUpdated: new Date().toISOString() },
  { pair: 'GBP/USD', bid: 1.2560, ask: 1.2575, mid: 1.2568, change: 0.1, changeDirection: 'up', lastUpdated: new Date().toISOString() },
];

export const mockMoneyMarketRates: MoneyMarketRate[] = [
  { instrument: 'OBB (Overnight)', bid: 26.50, offer: 27.50, mid: 27.00, change: 0.50, changeDirection: 'up' },
  { instrument: 'O/N (Overnight)', bid: 27.00, offer: 28.00, mid: 27.50, change: 0.25, changeDirection: 'up' },
  { instrument: 'Call', bid: 25.00, offer: 26.00, mid: 25.50, change: -0.50, changeDirection: 'down' },
  { instrument: '30-day', bid: 14.00, offer: 14.50, mid: 14.25, change: 0, changeDirection: 'flat' },
  { instrument: '90-day', bid: 15.00, offer: 15.50, mid: 15.25, change: 0.25, changeDirection: 'up' },
  { instrument: '180-day', bid: 16.00, offer: 16.75, mid: 16.38, change: 0.13, changeDirection: 'up' },
];

export const mockFeedStatus: FeedStatus[] = [
  { feedCode: 'REUTERS', feedName: 'Reuters Eikon', provider: 'LSEG', status: 'ONLINE', latencyMs: 45, recordsPerHour: 12456, errorCount: 0, lastUpdateSecondsAgo: 2, qualityScore: 98 },
  { feedCode: 'BBG', feedName: 'Bloomberg', provider: 'Bloomberg LP', status: 'ONLINE', latencyMs: 78, recordsPerHour: 8901, errorCount: 2, lastUpdateSecondsAgo: 5, qualityScore: 94 },
  { feedCode: 'CBN', feedName: 'CBN Official Rates', provider: 'CBN', status: 'ONLINE', latencyMs: 120, recordsPerHour: 24, errorCount: 0, lastUpdateSecondsAgo: 3600, qualityScore: 89 },
  { feedCode: 'FMDQ', feedName: 'FMDQ OTC', provider: 'FMDQ Securities', status: 'ONLINE', latencyMs: 95, recordsPerHour: 456, errorCount: 1, lastUpdateSecondsAgo: 15, qualityScore: 91 },
  { feedCode: 'NSE', feedName: 'NGX Exchange', provider: 'Nigerian Exchange', status: 'DEGRADED', latencyMs: 250, recordsPerHour: 2340, errorCount: 8, lastUpdateSecondsAgo: 45, qualityScore: 72 },
];

export const mockOrders: MarketOrder[] = [
  { id: 1, orderRef: 'ORD-20260319-001', orderType: 'LIMIT', direction: 'BUY', instrument: 'NGFGN2031A', instrumentName: 'FGN Bond 14.55% 2031', quantity: 500000000, price: 102.50, filledQuantity: 300000000, avgFillPrice: 102.45, timeInForce: 'DAY', status: 'PARTIALLY_FILLED', createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), account: 'TRADING' },
  { id: 2, orderRef: 'ORD-20260319-002', orderType: 'MARKET', direction: 'SELL', instrument: 'NGTB2026B', instrumentName: 'NTB 182-day Apr 2026', quantity: 1000000000, price: null, filledQuantity: 1000000000, avgFillPrice: 96.25, timeInForce: 'IOC', status: 'FILLED', createdAt: new Date(Date.now() - 4 * 3600000).toISOString(), account: 'TRADING' },
  { id: 3, orderRef: 'ORD-20260319-003', orderType: 'LIMIT', direction: 'BUY', instrument: 'USD/NGN', instrumentName: 'USD/NGN FX Spot', quantity: 5000000, price: 1548.00, filledQuantity: 0, avgFillPrice: null, timeInForce: 'GTC', status: 'NEW', createdAt: new Date(Date.now() - 1 * 3600000).toISOString(), account: 'FX_BOOK' },
];

export const mockConfirmations: TradeConfirmation[] = [
  { id: 1, confirmRef: 'CNF-001', dealRef: 'DL-2026-456', counterparty: 'Stanbic IBTC', instrument: 'FGN Bond 14.55% 2031', direction: 'BUY', amount: 500000000, rate: 102.50, valueDate: '2026-03-21', matchStatus: 'MATCHED', ourTerms: { amount: '500,000,000', rate: '102.50', valueDate: '21 Mar 2026' }, theirTerms: { amount: '500,000,000', rate: '102.50', valueDate: '21 Mar 2026' }, status: 'CONFIRMED' },
  { id: 2, confirmRef: 'CNF-002', dealRef: 'DL-2026-457', counterparty: 'Access Bank', instrument: 'USD/NGN FX Spot', direction: 'SELL', amount: 2000000, rate: 1550.00, valueDate: '2026-03-21', matchStatus: 'UNMATCHED', ourTerms: { amount: '2,000,000', rate: '1,550.00', valueDate: '21 Mar 2026' }, theirTerms: { amount: '2,000,000', rate: '1,549.50', valueDate: '21 Mar 2026' }, status: 'PENDING' },
  { id: 3, confirmRef: 'CNF-003', dealRef: 'DL-2026-458', counterparty: 'Zenith Bank', instrument: 'NTB 91-day', direction: 'BUY', amount: 1000000000, rate: 18.25, valueDate: '2026-03-20', matchStatus: 'ALLEGED', ourTerms: {}, theirTerms: { amount: '1,000,000,000', rate: '18.25', valueDate: '20 Mar 2026' }, status: 'PENDING' },
];

export const mockFails: SettlementFail[] = [
  { id: 1, failRef: 'FAIL-001', instructionRef: 'SI-2026-789', instrument: 'FGN Bond 16.25% 2035', amount: 750000000, counterparty: 'GTBank', failSince: '2026-03-15', agingDays: 4, penaltyAccrued: 12500, escalation: 'OPERATIONS', status: 'OPEN' },
  { id: 2, failRef: 'FAIL-002', instructionRef: 'SI-2026-790', instrument: 'DANGCEM Equity', amount: 45000000, counterparty: 'Coronation MB', failSince: '2026-03-12', agingDays: 7, penaltyAccrued: 47250, escalation: 'DESK_HEAD', status: 'INVESTIGATING' },
];
