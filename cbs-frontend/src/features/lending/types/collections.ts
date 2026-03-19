export interface CollectionCase {
  id: number;
  loanNumber: string;
  customerId: number;
  customerName: string;
  outstanding: number;
  dpd: number;
  bucket: '1-30' | '31-60' | '61-90' | '91-180' | '180+';
  classification: string; // WATCH, SUBSTANDARD, DOUBTFUL, LOSS
  assignedTo?: string;
  lastAction?: string;
  lastActionDate?: string;
  nextActionDue?: string;
  currency: string;
}

export interface DunningQueueItem {
  id: number;
  loanNumber: string;
  customerName: string;
  dpd: number;
  nextAction: 'SMS' | 'EMAIL' | 'CALL' | 'LETTER' | 'LEGAL_NOTICE';
  dueDate: string;
  phone: string;
  outcome?: string;
}

export interface WriteOffRequest {
  id: number;
  loanNumber: string;
  customerName: string;
  outstanding: number;
  provisionHeld: number;
  recoveryProbability: number; // percent
  requestedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
}

export interface RecoveryRecord {
  id: number;
  loanNumber: string;
  writtenOff: number;
  writeOffDate: string;
  recovered: number;
  recoveryPct: number;
  lastRecovery?: string;
  agent?: string;
}

export interface CollectionStats {
  totalDelinquent: number;
  cases: number;
  recoveredMtd: number;
  writtenOffMtd: number;
}

export interface DpdAging {
  bucket: string;
  amount: number;
  count: number;
}
