import { apiGet, apiPost } from '@/lib/api';

// ─── Deal Types ────────────────────────────────────────────────────────────────

export type DealType = 'FX' | 'REPO' | 'BOND' | 'MM' | 'TB';
export type DealStatus = 'BOOKED' | 'CONFIRMED' | 'SETTLED' | 'CANCELLED';

export interface TreasuryDeal {
  id: string;
  dealRef: string;
  type: DealType;
  counterparty: string;
  currency: string;
  amount: number;
  rate: number;
  maturityDate: string;
  deskId: string;
  deskName: string;
  status: DealStatus;
  bookedAt: string;
  confirmedAt?: string;
  settledAt?: string;
  createdBy: string;
}

export interface BookDealRequest {
  type: DealType;
  counterparty: string;
  currency: string;
  amount: number;
  rate: number;
  maturityDate: string;
  deskId: string;
}

export interface TreasuryDealsParams {
  status?: DealStatus | 'ALL';
  page?: number;
  size?: number;
}

// ─── Analytics Types ───────────────────────────────────────────────────────────

export interface TreasuryAnalyticsRecord {
  id: string;
  currency: string;
  nim: number;
  yield: number;
  car: number;
  roa: number;
  roe: number;
  recordedAt: string;
}

export interface RecordAnalyticsRequest {
  currency: string;
  nim: number;
  yield: number;
  car: number;
  roa: number;
  roe: number;
}

// ─── Dealer Desk Types ─────────────────────────────────────────────────────────

export type DeskStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type AssetClass = 'FX' | 'FIXED_INCOME' | 'MONEY_MARKET' | 'EQUITY' | 'DERIVATIVES';

export interface DealerDesk {
  id: string;
  code: string;
  name: string;
  assetClass: AssetClass;
  status: DeskStatus;
  headDealerId: string;
  headDealerName: string;
  activeDeelersCount: number;
  positionCount: number;
  positionLimit: number;
  utilizationPct: number;
  todayPnl: number;
  mtdPnl: number;
}

export interface DeskDashboard {
  deskId: string;
  deskName: string;
  assetClass: AssetClass;
  positions: TraderPosition[];
  todayRealizedPnl: number;
  todayUnrealizedPnl: number;
  todayFees: number;
  totalPnl: number;
  openDealsCount: number;
  utilizationPct: number;
}

export interface RecordPnlRequest {
  realized: number;
  unrealized: number;
  fees: number;
}

// ─── Trader Position Types ─────────────────────────────────────────────────────

export interface TraderPosition {
  id: string;
  dealerId: string;
  dealerName: string;
  deskId: string;
  deskName: string;
  instrument: string;
  currency: string;
  longPosition: number;
  shortPosition: number;
  netExposure: number;
  positionLimit: number;
  utilizationPct: number;
  unrealizedPnl: number;
  breachFlag: boolean;
  breachSince?: string;
  lastUpdated: string;
}

export interface OvernightPosition extends TraderPosition {
  overnightRate: number;
  fundingCost: number;
}

export interface PositionBreachParams {
  from: string;
  to: string;
}

// ─── Trading Book Types ────────────────────────────────────────────────────────

export type BookStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type BookType = 'TRADING' | 'BANKING' | 'AVAILABLE_FOR_SALE' | 'HELD_TO_MATURITY';

export interface TradingBook {
  id: string;
  bookCode: string;
  bookName: string;
  bookType: BookType;
  deskId: string;
  deskName: string;
  status: BookStatus;
  capitalRequirement: number;
  capitalAllocated: number;
  utilizationPct: number;
  lastSnapshotAt?: string;
  snapshotStatus?: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface TradingBookDashboard {
  bookId: string;
  bookName: string;
  totalPositions: number;
  marketValue: number;
  bookValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  var95: number;
  capitalUtilizationPct: number;
  holdings: BookHolding[];
}

export interface BookHolding {
  instrument: string;
  isin: string;
  quantity: number;
  avgCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnl: number;
}

export interface BookCapital {
  bookId: string;
  capitalRequirement: number;
  capitalAllocated: number;
  utilizationPct: number;
  excessCapital: number;
  componentBreakdown: { component: string; amount: number }[];
}

// ─── Market Making Types ───────────────────────────────────────────────────────

export type ObligationType = 'CONTINUOUS' | 'ON_REQUEST' | 'PERIODIC';
export type ComplianceStatus = 'COMPLIANT' | 'BREACH' | 'WARNING' | 'SUSPENDED';

export interface MarketMakingMandate {
  id: string;
  code: string;
  instrument: string;
  instrumentName: string;
  obligationType: ObligationType;
  maxBidAskSpreadBps: number;
  minQuoteSize: number;
  minQuoteTimePct: number;
  currentBidAskSpread?: number;
  complianceStatus: ComplianceStatus;
  quoteTimePct: number;
  todayVolume: number;
  mtdVolume: number;
  deskId: string;
}

export interface ObligationCompliance {
  mandateCode: string;
  instrument: string;
  periodStart: string;
  periodEnd: string;
  requiredQuoteTimePct: number;
  actualQuoteTimePct: number;
  maxAllowedSpreadBps: number;
  avgActualSpreadBps: number;
  breachCount: number;
  status: ComplianceStatus;
}

export interface MandatePerformance {
  mandateCode: string;
  instrument: string;
  dataPoints: { date: string; volume: number; spreadBps: number; quoteTimePct: number }[];
}

// ─── Market Order Types ────────────────────────────────────────────────────────

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderStatus = 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'EXPIRED' | 'REJECTED';

export interface TradingMarketOrder {
  id: string;
  orderRef: string;
  instrument: string;
  instrumentName: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  orderType: OrderType;
  filledQuantity: number;
  avgFillPrice?: number;
  deskId: string;
  deskName: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SubmitOrderRequest {
  instrument: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  orderType: OrderType;
  deskId: string;
}

// ─── Order Execution Types ─────────────────────────────────────────────────────

export interface OrderExecution {
  id: string;
  executionRef: string;
  orderId: string;
  orderRef: string;
  instrument: string;
  side: OrderSide;
  executedQuantity: number;
  executedPrice: number;
  counterparty: string;
  venue: string;
  fee: number;
  executedAt: string;
}

// ─── Program Trading Types ─────────────────────────────────────────────────────

export interface ProgramExecution {
  id: string;
  programId: string;
  programName: string;
  strategy: string;
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  ordersGenerated: number;
  ordersFilled: number;
  totalValue: number;
  pnl: number;
}

// ─── Quote Types ───────────────────────────────────────────────────────────────

export interface ActiveQuote {
  id: string;
  deskId: string;
  instrument: string;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  spreadBps: number;
  validUntil: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

// ─── Trading Model Types ───────────────────────────────────────────────────────

export type ModelStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'SUSPENDED' | 'RETIRED';

export interface TradingModel {
  id: string;
  modelCode: string;
  modelName: string;
  description: string;
  assetClass: AssetClass;
  status: ModelStatus;
  lastReviewDate: string;
  nextReviewDate: string;
  backtestSharpe: number;
  backtestMaxDrawdown: number;
  livePerformancePct: number;
  createdBy: string;
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const tradingApi = {
  // Deals
  listDeals: (params?: TreasuryDealsParams) =>
    apiGet<TreasuryDeal[]>('/v1/treasury/deals', params as Record<string, unknown>),
  getDeal: (id: string) =>
    apiGet<TreasuryDeal>(`/v1/treasury/deals/${id}`),
  bookDeal: (data: BookDealRequest) =>
    apiPost<TreasuryDeal>('/v1/treasury/deals', data),
  confirmDeal: (id: string) =>
    apiPost<TreasuryDeal>(`/v1/treasury/deals/${id}/confirm`),
  settleDeal: (id: string) =>
    apiPost<TreasuryDeal>(`/v1/treasury/deals/${id}/settle`),

  // Analytics
  recordAnalytics: (data: RecordAnalyticsRequest) =>
    apiPost<TreasuryAnalyticsRecord>('/v1/treasury-analytics', data),
  getAnalyticsByCurrency: (currency: string) =>
    apiGet<TreasuryAnalyticsRecord[]>(`/v1/treasury-analytics/${currency}`),

  // Dealer Desks
  listDealerDesks: () =>
    apiGet<DealerDesk[]>('/v1/dealer-desks'),
  getDeskDashboard: (id: string) =>
    apiGet<DeskDashboard>(`/v1/dealer-desks/${id}/dashboard`),
  recordDeskPnl: (id: string, data: RecordPnlRequest) =>
    apiPost<void>(`/v1/dealer-desks/${id}/pnl`, data),

  // Trader Positions
  getPositionsByDealer: (dealerId: string) =>
    apiGet<TraderPosition[]>(`/v1/trader-positions/dealer/${dealerId}`),
  getPositionBreaches: (params: PositionBreachParams) =>
    apiGet<TraderPosition[]>('/v1/trader-positions/breaches', params as Record<string, unknown>),
  getOvernightPositions: (deskId: string) =>
    apiGet<OvernightPosition[]>(`/v1/trader-positions/overnight/${deskId}`),

  // Trading Books
  listTradingBooks: () =>
    apiGet<TradingBook[]>('/v1/trading-books'),
  getTradingBookDashboard: (id: string) =>
    apiGet<TradingBookDashboard>(`/v1/trading-books/${id}/dashboard`),
  getTradingBookCapital: (id: string) =>
    apiGet<BookCapital>(`/v1/trading-books/${id}/capital`),
  snapshotTradingBook: (id: string) =>
    apiPost<void>(`/v1/trading-books/${id}/snapshot`),

  // Market Making
  getActiveMarketMaking: () =>
    apiGet<MarketMakingMandate[]>('/v1/market-making/active'),
  getObligationCompliance: () =>
    apiGet<ObligationCompliance[]>('/v1/market-making/obligation-compliance'),
  getMandatePerformance: (code: string) =>
    apiGet<MandatePerformance>(`/v1/market-making/${code}/performance`),

  // Market Orders
  getOpenMarketOrders: () =>
    apiGet<TradingMarketOrder[]>('/v1/market-orders/open'),
  getMarketOrder: (ref: string) =>
    apiGet<TradingMarketOrder>(`/v1/market-orders/${ref}`),
  submitMarketOrder: (data: SubmitOrderRequest) =>
    apiPost<TradingMarketOrder>('/v1/market-orders', data),
  cancelMarketOrder: (ref: string) =>
    apiPost<void>(`/v1/market-orders/${ref}/cancel`),

  // Order Executions
  getExecutionsByOrder: (orderId: string) =>
    apiGet<OrderExecution[]>(`/v1/order-executions/order/${orderId}`),

  // Program Trading
  getActiveProgramExecutions: () =>
    apiGet<ProgramExecution[]>('/v1/program-trading/executions/active'),

  // Quotes
  getActiveDeskQuotes: (deskId: string) =>
    apiGet<ActiveQuote[]>(`/v1/quotes/active/${deskId}`),

  // Trading Models
  listTradingModels: () =>
    apiGet<TradingModel[]>('/v1/trading-models'),
  getModelsDueForReview: () =>
    apiGet<TradingModel[]>('/v1/trading-models/due-for-review'),
};
