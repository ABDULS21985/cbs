// Auto-generated from backend entities

export interface DealingDesk {
  id: number;
  deskCode: string;
  deskName: string;
  deskType: string;
  headDealerName: string;
  headDealerEmployeeId: string;
  location: string;
  timezone: string;
  tradingHoursStart: string;
  tradingHoursEnd: string;
  tradingDays: string[];
  supportedInstruments: string[];
  supportedCurrencies: string[];
  maxOpenPositionLimit: number;
  maxSingleTradeLimit: number;
  dailyVarLimit: number;
  stopLossLimit: number;
  pnlCurrency: string;
  status: string;
}

export interface DeskDealer {
  id: number;
  deskId: number;
  employeeId: string;
  dealerName: string;
  dealerRole: string;
  authorizedInstruments: string[];
  singleTradeLimit: number;
  dailyVolumeLimit: number;
  requiresCounterSign: boolean;
  counterSignThreshold: number;
  status: string;
  authorizedFrom: string;
  authorizedTo: string;
}

