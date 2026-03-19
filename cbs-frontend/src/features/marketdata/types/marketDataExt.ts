// Auto-generated from backend entities

export interface MarketDataFeed {
  id: number;
  feedCode: string;
  feedName: string;
  provider: string;
  feedType: string;
  dataCategory: string;
  instrumentsCovered: string[];
  updateFrequencySec: number;
  connectionProtocol: string;
  endpointUrl: string;
  lastUpdateAt: string;
  recordsToday: number;
  errorCountToday: number;
  isActive: boolean;
  status: string;
}

export interface MarketPrice {
  id: number;
  instrumentCode: string;
  priceType: string;
  price: number;
  currency: string;
  source: string;
  priceDate: string;
  priceTime: string;
  createdAt: string;
}

export interface MarketSignal {
  id: number;
  signalCode: string;
  instrumentCode: string;
  instrumentName: string;
  signalType: string;
  signalDirection: string;
  confidencePct: number;
  signalStrength: string;
  indicatorsUsed: string[];
  analysisSummary: string;
  targetPrice: number;
  stopLoss: number;
  timeHorizon: string;
  signalDate: string;
  expiresAt: string;
  status: string;
}

