// Auto-generated from backend entities

export interface CashPoolParticipant {
  id: number;
  poolId: number;
  accountId: number;
  participantName: string;
  participantRole: string;
  sweepDirection: string;
  targetBalance: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface CashPoolSweepLog {
  id: number;
  poolId: number;
  participantId: number;
  sweepDirection: string;
  amount: number;
  fromAccountId: number;
  toAccountId: number;
  balanceBefore: number;
  balanceAfter: number;
  sweepType: string;
  isIntercompanyLoan: boolean;
  valueDate: string;
  status: string;
  createdAt: string;
}

