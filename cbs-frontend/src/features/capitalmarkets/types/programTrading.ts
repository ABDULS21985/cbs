// Auto-generated from backend entities

export interface ProgramExecution {
  id: number;
  executionRef: string;
  strategyId: number;
  executionDate: string;
  parentOrderRef: string;
  targetQuantity: number;
  targetAmount: number;
  executedQuantity: number;
  executedAmount: number;
  avgExecutionPrice: number;
  benchmarkPrice: number;
  slippageBps: number;
  childOrderCount: number;
  completionPct: number;
  startedAt: string;
  completedAt?: string;
  cancelledReason?: string;
  status: string;
}

export interface TradingStrategy {
  id: number;
  strategyCode: string;
  strategyName: string;
  strategyType: string;
  deskId: number;
  instrumentScope: Record<string, unknown>;
  executionAlgorithm: string;
  parameters: Record<string, unknown>;
  riskLimits: Record<string, unknown>;
  preTradeChecks: Record<string, unknown>;
  approvedBy: string;
  approvalDate: string;
  modelRiskTier: string;
  status: string;
}

