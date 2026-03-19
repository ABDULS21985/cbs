import { apiGet, apiPost } from '@/lib/api';
import type { FinancialStatement, StatementRatio } from '../types/financialStatement';

export const financialStatementsApi = {
  /** POST /v1/financial-statements/{code}/approve */
  approve: (code: string) =>
    apiPost<FinancialStatement>(`/api/v1/financial-statements/${code}/approve`),

  /** POST /v1/financial-statements/{code}/calculate-ratios */
  calculateRatios: (code: string) =>
    apiPost<StatementRatio[]>(`/api/v1/financial-statements/${code}/calculate-ratios`),

  /** GET /v1/financial-statements/customer/{id} */
  getByCustomer: (id: number) =>
    apiGet<FinancialStatement[]>(`/api/v1/financial-statements/customer/${id}`),

  /** GET /v1/financial-statements/{code}/ratios */
  getRatios: (code: string) =>
    apiGet<StatementRatio[]>(`/api/v1/financial-statements/${code}/ratios`),

};
