// Auto-generated from backend entities

export interface TdFrameworkAgreement {
  id: number;
  agreementNumber: string;
  customerId: number;
  agreementType: string;
  currency: string;
  minDepositAmount: number;
  maxDepositAmount: number;
  minTenorDays: number;
  maxTenorDays: number;
  rateStructure: string;
  baseRate: number;
  rateTiers: Map<String, Object[];
  benchmarkReference: string;
  spreadOverBenchmark: number;
  autoRolloverEnabled: boolean;
  rolloverTenorDays: number;
  rolloverRateType: string;
  maturityInstruction: string;
  earlyWithdrawalAllowed: boolean;
  earlyWithdrawalPenaltyPct: number;
  partialWithdrawalAllowed: boolean;
  partialWithdrawalMin: number;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
  approvedBy: string;
  createdAt: string;
  updatedAt?: string;
}

