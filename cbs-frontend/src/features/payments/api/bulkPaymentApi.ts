import { apiGet, apiPost, apiUpload } from '@/lib/api';

export interface BulkPaymentRow {
  rowNumber: number;
  beneficiaryName: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  amount: number;
  narration: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  errorMessage?: string;
  warningMessage?: string;
  transactionRef?: string;
  executionStatus?: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  failureReason?: string;
}

export interface BulkPaymentBatch {
  id: number;
  batchRef: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  totalAmount: number;
  currency: string;
  sourceAccountId?: number;
  feeEstimate: number;
  status: 'UPLOADED' | 'VALIDATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'REJECTED';
  processedCount: number;
  successCount: number;
  failedCount: number;
  rows: BulkPaymentRow[];
  submittedBy?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface PayrollEntry extends BulkPaymentRow {
  employeeId: string;
  grossAmount: number;
  taxDeduction: number;
  pensionDeduction: number;
  otherDeductions: number;
  netAmount: number;
}

export interface PayrollBatch extends Omit<BulkPaymentBatch, 'rows'> {
  payPeriod: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  rows: PayrollEntry[];
}

export const bulkPaymentApi = {
  upload: (file: File) =>
    apiUpload<BulkPaymentBatch>('/api/v1/payments/bulk/upload', file),
  getBatch: (id: number) =>
    apiGet<BulkPaymentBatch>(`/api/v1/payments/bulk/${id}`),
  validateBatch: (id: number, sourceAccountId: number) =>
    apiPost<BulkPaymentBatch>(`/api/v1/payments/bulk/${id}/validate`, { sourceAccountId }),
  submitForApproval: (id: number, notes?: string) =>
    apiPost<BulkPaymentBatch>(`/api/v1/payments/bulk/${id}/submit`, { notes }),
  approve: (id: number) =>
    apiPost<BulkPaymentBatch>(`/api/v1/payments/bulk/${id}/approve`, {}),
  reject: (id: number, reason: string) =>
    apiPost<BulkPaymentBatch>(`/api/v1/payments/bulk/${id}/reject`, { reason }),
  getProcessingStatus: (id: number) =>
    apiGet<BulkPaymentBatch>(`/api/v1/payments/bulk/${id}/status`),
  retryFailed: (id: number, rowNumbers: number[]) =>
    apiPost<BulkPaymentBatch>(`/api/v1/payments/bulk/${id}/retry`, { rowNumbers }),
  downloadTemplate: () => '/api/v1/payments/bulk/template',
  uploadPayroll: (file: File) =>
    apiUpload<PayrollBatch>('/api/v1/payments/payroll/upload', file),
  getPayrollBatch: (id: number) =>
    apiGet<PayrollBatch>(`/api/v1/payments/payroll/${id}`),
};
