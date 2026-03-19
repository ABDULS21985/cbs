// Auto-generated from backend entities

export interface PayrollBatch {
  id: number;
  batchId: string;
  customerId: number;
  companyName: string;
  debitAccountId: number;
  payrollType: string;
  currency: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  totalTax: number;
  totalPensionEmployer: number;
  totalPensionEmployee: number;
  totalNhf: number;
  totalNsitf: number;
  status: string;
  approvedBy: string;
  approvedAt: string;
  processedAt: string;
  failedCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollItem {
  id: number;
  batchId: number;
  employeeId: string;
  employeeName: string;
  creditAccountNumber: string;
  creditBankCode: string;
  grossAmount: number;
  taxAmount: number;
  pensionAmount: number;
  otherDeductions: number;
  netAmount: number;
  narration: string;
  status: string;
  failureReason: string;
  paymentReference: string;
  createdAt: string;
}

