// Auto-generated from backend entities

interface Account {
  id: number;
  accountNumber: string;
  accountName?: string;
}

interface Customer {
  id: number;
  name?: string;
  customerNumber?: string;
}

type ChequeStatus = 'ISSUED' | 'PRESENTED' | 'CLEARED' | 'STOPPED' | 'RETURNED' | 'SPOILED' | string;

export interface ChequeBook {
  id: number;
  account: Account;
  customer: Customer;
  seriesPrefix: string;
  startNumber: number;
  endNumber: number;
  totalLeaves: number;
  usedLeaves: number;
  spoiledLeaves: number;
  status: string;
  issuedDate: string;
  createdAt: string;
  createdBy: string;
  version: number;
  leaves: ChequeLeaf[];
}

export interface ChequeLeaf {
  id: number;
  chequeBook: ChequeBook;
  chequeNumber: string;
  account: Account;
  payeeName: string;
  amount: number;
  currencyCode: string;
  chequeDate: string;
  presentedDate: string;
  clearingDate: string;
  presentingBankCode: string;
  status: ChequeStatus;
  returnReason: string;
  stopReason: string;
  stoppedBy: string;
  stoppedAt: string;
  micrCode: string;
}

