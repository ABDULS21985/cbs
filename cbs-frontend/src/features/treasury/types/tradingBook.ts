// Auto-generated from backend entities

export interface TradingBookSnapshot {
  id: number;
  bookId: number;
  snapshotDate: string;
  snapshotType: string;
  positionCount: number;
  grossPositionValue: number;
  netPositionValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  var951d: number;
  var991d: number;
  expectedShortfall: number;
  greeks: Record<string, unknown>;
  concentrationByInstrument: Record<string, unknown>;
  concentrationByCurrency: Record<string, unknown>;
  concentrationByCounterparty: Record<string, unknown>;
  limitBreaches: Record<string, unknown>;
  capitalCharge: number;
  createdAt: string;
}

