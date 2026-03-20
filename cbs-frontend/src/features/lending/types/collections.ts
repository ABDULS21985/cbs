export interface CollectionAction {
  id: number;
  actionType: string;
  description: string;
  outcome?: string;
  promisedAmount?: number;
  promisedDate?: string;
  promiseKept?: boolean;
  contactNumber?: string;
  contactPerson?: string;
  nextActionDate?: string;
  nextActionType?: string;
  performedBy: string;
  performedAt: string;
}

export interface CollectionCase {
  id: number;
  caseNumber?: string;
  loanNumber: string;
  customerId: number;
  customerName: string;
  outstanding: number;
  overdueAmount?: number;
  dpd: number;
  bucket: '1-30' | '31-60' | '61-90' | '91-180' | '180+';
  classification: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  team?: string;
  escalationLevel?: number;
  resolutionType?: string;
  resolutionAmount?: number;
  lastAction?: string;
  lastActionDate?: string;
  nextActionDue?: string;
  currency: string;
  actions?: CollectionAction[];
  createdAt?: string;
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
