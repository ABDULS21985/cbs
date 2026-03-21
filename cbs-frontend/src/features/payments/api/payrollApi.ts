import { apiGet, apiPost } from '@/lib/api';
import type { PayrollBatch, PayrollItem } from '../types/payroll';

export const payrollApi = {
  /** GET /v1/payroll/batches — list all payroll batches */
  listAll: () =>
    apiGet<PayrollBatch[]>('/api/v1/payroll/batches'),

  /** POST /v1/payroll/batches */
  create: (data: Partial<PayrollBatch>) =>
    apiPost<PayrollBatch>('/api/v1/payroll/batches', data),

  /** POST /v1/payroll/batches/{batchId}/validate — batchId is String on backend */
  validate: (batchId: string) =>
    apiPost<PayrollBatch>(`/api/v1/payroll/batches/${batchId}/validate`),

  /** POST /v1/payroll/batches/{batchId}/approve — ADMIN only */
  approve: (batchId: string) =>
    apiPost<PayrollBatch>(`/api/v1/payroll/batches/${batchId}/approve`),

  /** POST /v1/payroll/batches/{batchId}/process — ADMIN only */
  process: (batchId: string) =>
    apiPost<PayrollBatch>(`/api/v1/payroll/batches/${batchId}/process`),

  /** GET /v1/payroll/batches/{batchId}/items */
  getItems: (batchId: string) =>
    apiGet<PayrollItem[]>(`/api/v1/payroll/batches/${batchId}/items`),

  /** GET /v1/payroll/customer/{customerId} */
  byCustomer: (customerId: number) =>
    apiGet<PayrollBatch[]>(`/api/v1/payroll/customer/${customerId}`),
};
