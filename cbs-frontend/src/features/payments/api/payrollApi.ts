import { apiGet, apiPost } from '@/lib/api';
import type { PayrollBatch, PayrollItem } from '../types/payroll';

export const payrollApi = {
  /** POST /v1/payroll/batches */
  create: (data: Partial<PayrollBatch>) =>
    apiPost<PayrollBatch>('/api/v1/payroll/batches', data),

  /** POST /v1/payroll/batches/{batchId}/validate */
  validate: (batchId: number) =>
    apiPost<PayrollBatch>(`/api/v1/payroll/batches/${batchId}/validate`),

  /** POST /v1/payroll/batches/{batchId}/approve */
  approve: (batchId: number) =>
    apiPost<PayrollBatch>(`/api/v1/payroll/batches/${batchId}/approve`),

  /** POST /v1/payroll/batches/{batchId}/process */
  process: (batchId: number) =>
    apiPost<PayrollBatch>(`/api/v1/payroll/batches/${batchId}/process`),

  /** GET /v1/payroll/batches/{batchId}/items */
  getItems: (batchId: number) =>
    apiGet<PayrollItem[]>(`/api/v1/payroll/batches/${batchId}/items`),

  /** GET /v1/payroll/customer/{customerId} */
  byCustomer: (customerId: number) =>
    apiGet<PayrollBatch[]>(`/api/v1/payroll/customer/${customerId}`),

};
