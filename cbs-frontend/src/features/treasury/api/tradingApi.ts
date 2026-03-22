import { apiGet, apiPost } from '@/lib/api';

// ─── Deal Types ────────────────────────────────────────────────────────────────

export type DealType = 'FX' | 'REPO' | 'BOND' | 'MM' | 'TB'
  | 'FX_SPOT' | 'FX_FORWARD' | 'FX_SWAP'
  | 'MONEY_MARKET_PLACEMENT' | 'MONEY_MARKET_BORROWING'
  | 'BOND_PURCHASE' | 'BOND_SALE'
  | 'REVERSE_REPO' | 'TBILL_PURCHASE' | 'TBILL_DISCOUNT';
export type DealStatus = 'BOOKED' | 'CONFIRMED' | 'SETTLED' | 'MATURED' | 'CANCELLED' | 'DEFAULTED';

export interface TreasuryDeal {
  id: string;
  dealRef: string;
  type: DealType;
  counterparty: string;
  currency: string;
  amount: number;
  rate: number;
  maturityDate: string;
  /** Leg 1 value date (trade settlement start date), mapped from backend `leg1ValueDate` */
  valueDate?: string;
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
  // UI convenience fields (used by the deal form)
  counterparty: string;
  currency: string;
  amount: number;
  rate: number;
  maturityDate: string;
  valueDate?: string;
  deskId: string;
  // Backend @RequestParam fields (populated in the API call from the above)
  counterpartyId?: number;
  leg1Currency?: string;
  leg1Amount?: number;
  leg1AccountId?: number;
  leg1ValueDate?: string;
  leg2Currency?: string;
  leg2Amount?: number;
  leg2AccountId?: number;
  leg2ValueDate?: string;
  dealRate?: number;
  yieldRate?: number;
  tenorDays?: number;
  dealer?: string;
}

export interface AmendDealRequest {
  newAmount?: number;
  newRate?: number;
  newMaturityDate?: string;
  reason: string;
  amendedBy: string;
}

export interface DealAuditEvent {
  event: string;
  timestamp: string;
  user: string;
  details: string;
}

export interface DealAuditTrail {
  dealRef: string;
  events: DealAuditEvent[];
  lastAmendment?: {
    previousAmount: number;
    previousRate: number;
    previousMaturityDate: string;
    reason: string;
    amendedBy: string;
    amendedAt: string;
  };
  amendmentCount?: number;
}

export interface DealCashFlow {
  date: string;
  direction: 'PAY' | 'RECEIVE';
  amount: number;
  currency: string;
  status: 'PROJECTED' | 'SETTLED' | 'OVERDUE';
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

/** Must match DeskPnl entity field names sent as @RequestBody to POST /v1/dealer-desks/{id}/pnl */
export interface RecordPnlRequest {
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  tradingRevenue?: number;
  hedgingCost?: number;
  fundingCost?: number;
  varUtilizationPct?: number;
  currency?: string;
  pnlDate?: string;
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
  instrumentCode: string;
  instrumentName?: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  orderType: OrderType;
  deskId: string | number;
  timeInForce?: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  currency?: string;
  instrumentType?: string;
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

export interface InstrumentOption {
  code: string;
  name: string;
  instrumentType: string;
  assetClass: string;
  currency: string;
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

// ─── Backend-to-Frontend Mapping ────────────────────────────────────────────────

/** Maps backend DealType enum to frontend short codes */
const DEAL_TYPE_MAP: Record<string, DealType> = {
  FX_SPOT: 'FX', FX_FORWARD: 'FX', FX_SWAP: 'FX',
  MONEY_MARKET_PLACEMENT: 'MM', MONEY_MARKET_BORROWING: 'MM',
  BOND_PURCHASE: 'BOND', BOND_SALE: 'BOND',
  REPO: 'REPO', REVERSE_REPO: 'REPO',
  TBILL_PURCHASE: 'TB', TBILL_DISCOUNT: 'TB',
  // Passthrough for already-mapped values
  FX: 'FX', MM: 'MM', BOND: 'BOND', TB: 'TB',
};

/** Maps frontend DealType to backend enum */
const DEAL_TYPE_REVERSE: Partial<Record<DealType, string>> = {
  FX: 'FX_SPOT', REPO: 'REPO', BOND: 'BOND_PURCHASE', MM: 'MONEY_MARKET_PLACEMENT', TB: 'TBILL_PURCHASE',
  FX_SPOT: 'FX_SPOT', FX_FORWARD: 'FX_FORWARD', FX_SWAP: 'FX_SWAP',
  MONEY_MARKET_PLACEMENT: 'MONEY_MARKET_PLACEMENT', MONEY_MARKET_BORROWING: 'MONEY_MARKET_BORROWING',
  BOND_PURCHASE: 'BOND_PURCHASE', BOND_SALE: 'BOND_SALE',
  REVERSE_REPO: 'REVERSE_REPO', TBILL_PURCHASE: 'TBILL_PURCHASE', TBILL_DISCOUNT: 'TBILL_DISCOUNT',
};

/** Maps backend DealStatus to frontend status.
 *  Backend enum: PENDING | CONFIRMED | SETTLED | MATURED | CANCELLED | DEFAULTED
 *  Frontend type: 'BOOKED' | 'CONFIRMED' | 'SETTLED' | 'MATURED' | 'CANCELLED' | 'DEFAULTED'
 */
const DEAL_STATUS_MAP: Record<string, DealStatus> = {
  PENDING: 'BOOKED', CONFIRMED: 'CONFIRMED', SETTLED: 'SETTLED',
  MATURED: 'MATURED', CANCELLED: 'CANCELLED', DEFAULTED: 'DEFAULTED',
  // Passthrough for already-mapped values
  BOOKED: 'BOOKED',
};

/** Maps a raw backend TreasuryDeal entity to the frontend TreasuryDeal interface */
function mapBackendDeal(raw: Record<string, any>): TreasuryDeal {
  // If already mapped (has dealRef), return as-is
  if (raw.dealRef && raw.type && raw.amount !== undefined) return raw as unknown as TreasuryDeal;

  return {
    id: String(raw.id ?? ''),
    dealRef: raw.dealNumber ?? raw.dealRef ?? '',
    type: DEAL_TYPE_MAP[raw.dealType ?? raw.type] ?? (raw.dealType ?? raw.type ?? 'FX'),
    counterparty: raw.counterpartyName ?? raw.counterparty ?? '',
    currency: raw.leg1Currency ?? raw.currency ?? '',
    amount: Number(raw.leg1Amount ?? raw.amount ?? 0),
    rate: Number(raw.dealRate ?? raw.yieldRate ?? raw.rate ?? 0),
    maturityDate: raw.maturityDate ?? '',
    valueDate: raw.leg1ValueDate ?? raw.valueDate,
    // `dealer` column stores the booking dealer's employee ID/name; not a deskId FK
    deskId: raw.deskId ?? '',
    deskName: raw.deskName ?? raw.branchCode ?? '',
    status: DEAL_STATUS_MAP[raw.status] ?? (raw.status as DealStatus) ?? 'BOOKED',
    bookedAt: raw.createdAt ?? raw.bookedAt ?? '',
    confirmedAt: raw.confirmedAt,
    settledAt: raw.settledAt,
    createdBy: raw.dealer ?? raw.createdBy ?? '',
    // Pass through extra fields for detail page
    ...(raw.leg2Currency ? { leg2Currency: raw.leg2Currency } : {}),
    ...(raw.leg2Amount ? { leg2Amount: raw.leg2Amount } : {}),
    ...(raw.realizedPnl !== undefined ? { realizedPnl: raw.realizedPnl } : {}),
    ...(raw.unrealizedPnl !== undefined ? { unrealizedPnl: raw.unrealizedPnl } : {}),
    ...(raw.accruedInterest !== undefined ? { accruedInterest: raw.accruedInterest } : {}),
    ...(raw.confirmedBy ? { confirmedBy: raw.confirmedBy } : {}),
    ...(raw.settledBy ? { settledBy: raw.settledBy } : {}),
    ...(raw.tenorDays ? { tenorDays: raw.tenorDays } : {}),
    ...(raw.spread !== undefined ? { spread: raw.spread } : {}),
  } as TreasuryDeal;
}

// ─── API Object ────────────────────────────────────────────────────────────────

export const tradingApi = {
  // Deals
  listDeals: async (params?: TreasuryDealsParams): Promise<TreasuryDeal[]> => {
    const queryParams: Record<string, unknown> = {};
    // Translate frontend status tokens to backend DealStatus enum values
    const FRONTEND_TO_BACKEND_STATUS: Record<string, string> = {
      BOOKED: 'PENDING', CONFIRMED: 'CONFIRMED', SETTLED: 'SETTLED',
      MATURED: 'MATURED', CANCELLED: 'CANCELLED', DEFAULTED: 'DEFAULTED',
    };
    if (params?.status && params.status !== 'ALL') {
      queryParams.status = FRONTEND_TO_BACKEND_STATUS[params.status] ?? params.status;
    }
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.size !== undefined) queryParams.size = params.size;
    const raw = await apiGet<any[]>('/api/v1/treasury/deals', queryParams);
    return (Array.isArray(raw) ? raw : []).map(mapBackendDeal);
  },
  getDeal: async (id: string): Promise<TreasuryDeal> => {
    const raw = await apiGet<any>(`/api/v1/treasury/deals/${id}`);
    return mapBackendDeal(raw);
  },
  bookDeal: async (data: BookDealRequest): Promise<TreasuryDeal> => {
    // Backend: POST /deals with ALL @RequestParam
    const params = new URLSearchParams();
    params.set('dealType', DEAL_TYPE_REVERSE[data.type] ?? data.type);
    params.set('leg1Currency', data.leg1Currency ?? data.currency ?? 'USD');
    params.set('leg1Amount', String(data.leg1Amount ?? data.amount ?? 0));
    params.set('leg1ValueDate', data.leg1ValueDate ?? data.valueDate ?? new Date().toISOString().slice(0, 10));
    if (data.counterpartyId != null) params.set('counterpartyId', String(data.counterpartyId));
    if (data.leg1AccountId != null) params.set('leg1AccountId', String(data.leg1AccountId));
    if (data.leg2Currency) params.set('leg2Currency', data.leg2Currency);
    if (data.leg2Amount != null) params.set('leg2Amount', String(data.leg2Amount));
    if (data.leg2AccountId != null) params.set('leg2AccountId', String(data.leg2AccountId));
    if (data.leg2ValueDate ?? data.maturityDate) params.set('leg2ValueDate', data.leg2ValueDate ?? data.maturityDate!);
    if (data.dealRate ?? data.rate) params.set('dealRate', String(data.dealRate ?? data.rate));
    if (data.yieldRate != null) params.set('yieldRate', String(data.yieldRate));
    if (data.tenorDays != null) params.set('tenorDays', String(data.tenorDays));
    // Only send `dealer` when explicitly provided — do NOT fall back to counterparty name
    // (the backend resolves the acting dealer from the security context for confirmDeal/settleDeal;
    //  for bookDeal the caller can pass an explicit dealer employee ID / name if known)
    if (data.dealer) params.set('dealer', data.dealer);
    const raw = await apiPost<any>(`/api/v1/treasury/deals?${params.toString()}`);
    return mapBackendDeal(raw);
  },
  confirmDeal: async (id: string): Promise<TreasuryDeal> => {
    const raw = await apiPost<any>(`/api/v1/treasury/deals/${id}/confirm`);
    return mapBackendDeal(raw);
  },
  settleDeal: async (id: string): Promise<TreasuryDeal> => {
    const raw = await apiPost<any>(`/api/v1/treasury/deals/${id}/settle`);
    return mapBackendDeal(raw);
  },
  amendDeal: async (id: string, data: AmendDealRequest): Promise<TreasuryDeal> => {
    const params = new URLSearchParams();
    if (data.newAmount !== undefined) params.set('newAmount', String(data.newAmount));
    if (data.newRate !== undefined) params.set('newRate', String(data.newRate));
    if (data.newMaturityDate) params.set('newMaturityDate', data.newMaturityDate);
    params.set('reason', data.reason);
    const raw = await apiPost<any>(`/api/v1/treasury/deals/${id}/amend?${params.toString()}`);
    return mapBackendDeal(raw);
  },
  getDealAuditTrail: (id: string) =>
    apiGet<DealAuditTrail>(`/api/v1/treasury/deals/${id}/audit-trail`),

  // Analytics
  recordAnalytics: (data: RecordAnalyticsRequest) =>
    apiPost<TreasuryAnalyticsRecord>('/api/v1/treasury/analytics/record', data),
  getAnalyticsByCurrency: (currency: string) =>
    apiGet<TreasuryAnalyticsRecord[]>('/api/v1/treasury/analytics', { currency }),

  // Dealer Desks
  listDealerDesks: async (): Promise<DealerDesk[]> => {
    const raw = await apiGet<any[]>('/api/v1/treasury/desks');
    return (Array.isArray(raw) ? raw : []).map((d) => ({
      ...d,
      id: String(d.id ?? ''),
      // headDealerId is already String on the backend record
    })) as DealerDesk[];
  },
  getDeskDashboard: (id: string) =>
    apiGet<DeskDashboard>(`/api/v1/treasury/desks/${id}`),
  recordDeskPnl: (id: string, data: RecordPnlRequest) =>
    apiPost<void>(`/api/v1/dealer-desks/${id}/pnl`, data),

  // Trader Positions
  getPositionsByDealer: async (dealerId: string): Promise<TraderPosition[]> => {
    const raw = await apiGet<any[]>(`/api/v1/treasury/positions/${dealerId}`);
    return (Array.isArray(raw) ? raw : []).map((p) => ({ ...p, id: String(p.id ?? '') })) as TraderPosition[];
  },
  getPositionBreaches: async (params: PositionBreachParams): Promise<TraderPosition[]> => {
    const raw = await apiGet<any[]>('/api/v1/treasury/positions/breaches', params as unknown as Record<string, unknown>);
    return (Array.isArray(raw) ? raw : []).map((p) => ({ ...p, id: String(p.id ?? '') })) as TraderPosition[];
  },
  getOvernightPositions: async (deskId: string): Promise<OvernightPosition[]> => {
    const raw = await apiGet<any[]>(`/api/v1/trader-positions/overnight/${deskId}`);
    return (Array.isArray(raw) ? raw : []).map((p) => ({ ...p, id: String(p.id ?? '') })) as OvernightPosition[];
  },

  // Trading Books
  listTradingBooks: async (): Promise<TradingBook[]> => {
    const raw = await apiGet<any[]>('/api/v1/treasury/trading-books');
    return (Array.isArray(raw) ? raw : []).map((b) => ({
      ...b,
      id: String(b.id ?? ''),
      deskId: String(b.deskId ?? ''),
    })) as TradingBook[];
  },
  getTradingBookDashboard: (id: string) =>
    apiGet<TradingBookDashboard>(`/api/v1/trading-books/${id}/dashboard`),
  getTradingBookCapital: (id: string) =>
    apiGet<BookCapital>(`/api/v1/trading-books/${id}/capital`),
  snapshotTradingBook: (id: string) =>
    apiPost<void>(`/api/v1/treasury/trading-books/${id}/snapshot`),

  // Market Making
  getActiveMarketMaking: () =>
    apiGet<MarketMakingMandate[]>('/api/v1/treasury/market-making/mandates'),
  getObligationCompliance: () =>
    apiGet<ObligationCompliance[]>('/api/v1/treasury/market-making/compliance'),
  getMandatePerformance: (code: string) =>
    apiGet<MandatePerformance>(`/api/v1/treasury/market-making/${code}/performance`),

  // Market Orders
  getOpenMarketOrders: () =>
    apiGet<TradingMarketOrder[]>('/api/v1/treasury/orders', { status: 'OPEN' }),
  getMarketOrder: (ref: string) =>
    apiGet<TradingMarketOrder>(`/api/v1/market-orders/${ref}`),
  submitMarketOrder: (data: SubmitOrderRequest) =>
    apiPost<TradingMarketOrder>('/api/v1/treasury/orders', { ...data, deskId: Number(data.deskId) }),
  cancelMarketOrder: (id: string | number, reason?: string) =>
    apiPost<void>(`/api/v1/treasury/orders/${id}/cancel`, reason ? { reason } : {}),

  // Order Executions
  getExecutionsByOrder: async (orderId: string): Promise<OrderExecution[]> => {
    const raw = await apiGet<any[]>('/api/v1/treasury/executions', { orderId });
    return (Array.isArray(raw) ? raw : []).map((e) => ({
      ...e,
      id: String(e.id ?? ''),
      orderId: String(e.orderId ?? ''),
    })) as OrderExecution[];
  },

  // Program Trading
  getActiveProgramExecutions: () =>
    apiGet<ProgramExecution[]>('/api/v1/program-trading/executions/active'),

  // Quotes
  getActiveDeskQuotes: (deskId: string) =>
    apiGet<ActiveQuote[]>(`/api/v1/quotes/active/${deskId}`),

  // Trading Models
  listTradingModels: () =>
    apiGet<TradingModel[]>('/api/v1/trading-models'),
  getModelsDueForReview: () =>
    apiGet<TradingModel[]>('/api/v1/trading-models/due-for-review'),

  searchInstruments: (q: string) =>
    apiGet<InstrumentOption[]>('/api/v1/treasury/instruments', { q }),
};
