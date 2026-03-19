export interface SecurityHolding {
  id: number;
  holdingRef: string;
  isin: string;
  securityName: string;
  securityType: 'FGN_BOND' | 'T_BILL' | 'CORPORATE_BOND' | 'SUKUK' | 'EUROBOND' | 'STATE_BOND' | 'COMMERCIAL_PAPER';
  faceValue: number;
  bookValue: number;
  marketValue: number;
  couponRate: number;
  yieldToMaturity: number;
  maturityDate: string;
  duration: number;
  modifiedDuration: number;
  unrealizedPnl: number;
  currency: string;
  status: 'ACTIVE' | 'MATURED' | 'SOLD';
}

export interface CouponEvent {
  id: number;
  securityName: string;
  isin: string;
  eventType: 'COUPON' | 'MATURITY' | 'CALL';
  eventDate: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'RECEIVED' | 'REINVESTED';
}

export interface FxRate {
  pair: string;
  bid: number;
  ask: number;
  mid: number;
  change: number;
  changeDirection: 'up' | 'down' | 'flat';
  lastUpdated: string;
}

export interface MoneyMarketRate {
  instrument: string;
  bid: number;
  offer: number;
  mid: number;
  change: number;
  changeDirection: 'up' | 'down' | 'flat';
}

export interface FeedStatus {
  feedCode: string;
  feedName: string;
  provider: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  recordsPerHour: number;
  errorCount: number;
  lastUpdateSecondsAgo: number;
  qualityScore: number;
}

export interface MarketOrder {
  id: number;
  orderRef: string;
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  direction: 'BUY' | 'SELL';
  instrument: string;
  instrumentName: string;
  quantity: number;
  price: number | null;
  filledQuantity: number;
  avgFillPrice: number | null;
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'EXPIRED' | 'REJECTED';
  createdAt: string;
  account: string;
}

export interface Execution {
  id: number;
  executionRef: string;
  orderRef: string;
  time: string;
  price: number;
  quantity: number;
  counterparty: string;
  venue: string;
  fee: number;
}

export interface TradeConfirmation {
  id: number;
  confirmRef: string;
  dealRef: string;
  counterparty: string;
  instrument: string;
  direction: string;
  amount: number;
  rate: number;
  valueDate: string;
  matchStatus: 'MATCHED' | 'ALLEGED' | 'UNMATCHED';
  ourTerms: Record<string, string>;
  theirTerms: Record<string, string>;
  status: string;
}

export interface SettlementFail {
  id: number;
  failRef: string;
  instructionRef: string;
  instrument: string;
  amount: number;
  counterparty: string;
  failSince: string;
  agingDays: number;
  penaltyAccrued: number;
  escalation: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'BUY_IN_INITIATED' | 'RESOLVED';
}
