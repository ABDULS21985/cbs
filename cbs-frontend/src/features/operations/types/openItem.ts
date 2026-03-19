// Auto-generated from backend entities

export interface OpenItem {
  id: number;
  itemCode: string;
  itemType: string;
  itemCategory: string;
  description: string;
  referenceNumber: string;
  relatedAccountId: number;
  relatedTransactionId: number;
  currency: string;
  amount: number;
  valueDate: string;
  agingDays: number;
  assignedTo: string;
  assignedTeam: string;
  priority: string;
  resolutionAction: string;
  resolutionNotes: string;
  resolvedAt?: string;
  status: string;
}

