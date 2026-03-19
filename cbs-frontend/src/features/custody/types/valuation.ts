// Auto-generated from backend entities

export interface InstrumentValuation {
  id: number;
  runId: number;
  instrumentCode: string;
  isin: string;
  modelUsed: string;
  fairValueLevel: string;
  modelPrice: number;
  marketPrice: number;
  priceDeviation: number;
  deviationBreached: boolean;
  inputsUsed: Record<string, unknown>;
  sensitivityDelta: number;
  sensitivityGamma: number;
  sensitivityVega: number;
  duration: number;
  modifiedDuration: number;
  convexity: number;
  yieldToMaturity: number;
  spreadToBenchmark: number;
  dayCountConvention: string;
  accrualDays: number;
  accruedAmount: number;
  cleanPrice: number;
  dirtyPrice: number;
  previousValuation: number;
  valuationChange: number;
  status: string;
  createdAt: string;
}

export interface ValuationModel {
  id: number;
  modelCode: string;
  modelName: string;
  instrumentType: string;
  valuationMethodology: string;
  fairValueHierarchy: string;
  inputParameters: Record<string, unknown>;
  calibrationFrequency: string;
  lastCalibratedAt: string;
  independentPriceVerification: boolean;
  ipvFrequency: string;
  lastIpvDate: string;
  ipvThresholdPct: number;
  modelOwner: string;
  validatedBy: string;
  regulatoryApproval: boolean;
  status: string;
}

export interface ValuationRun {
  id: number;
  runRef: string;
  valuationDate: string;
  modelId: number;
  runType: string;
  instrumentsValued: number;
  totalMarketValue: number;
  currency: string;
  unrealizedGainLoss: number;
  fairValueLevel1Total: number;
  fairValueLevel2Total: number;
  fairValueLevel3Total: number;
  ipvBreachCount: number;
  pricingExceptions: Record<string, unknown>;
  runStartedAt: string;
  runCompletedAt?: string;
  status: string;
}

