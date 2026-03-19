// Auto-generated from backend entities

export interface BankDraft {
  id: number;
  draftNumber: string;
  customerId: number;
  debitAccountId: number;
  draftType: string;
  payeeName: string;
  amount: number;
  currency: string;
  issueBranchId: number;
  issueDate: string;
  expiryDate: string;
  deliveryMethod: string;
  deliveryAddress: string;
  micrLine: string;
  serialNumber: string;
  status: string;
  presentedAt: string;
  paidAt: string;
  stopReason: string;
  reissuedAs: string;
  commissionAmount: number;
  createdAt: string;
  updatedAt?: string;
}

