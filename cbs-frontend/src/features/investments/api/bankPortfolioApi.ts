import { apiGet, apiPost } from '@/lib/api';
import type { BankPortfolio } from '../types/bankPortfolio';

export const bankPortfoliosApi = {
  /** GET /v1/bank-portfolios */
  getAll: () =>
    apiGet<BankPortfolio[]>('/api/v1/bank-portfolios'),

  /** POST /v1/bank-portfolios */
  create: (data: Partial<BankPortfolio>) =>
    apiPost<BankPortfolio>('/api/v1/bank-portfolios', data),

  /** GET /v1/bank-portfolios/type/{type} */
  getByType: (type: string) =>
    apiGet<BankPortfolio[]>(`/api/v1/bank-portfolios/type/${type}`),
};
