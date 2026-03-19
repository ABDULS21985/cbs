// Auto-generated from backend entities

export interface ReceivableInvoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  invoiceType: string;
  description: string;
  currency: string;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  debitAccountId: number;
  dueDate: string;
  overdueDays: number;
  paymentReference: string;
  paidAmount: number;
  outstandingAmount: number;
  paidAt: string;
  status: string;
}

