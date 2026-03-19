import { apiGet } from '@/lib/api';
import type { BankPortfolio } from '../types/bankPortfolio';

export const bankPortfoliosApi = {
  /** GET /v1/bank-portfolios/type/{type} */
  create: (type: string) =>
    apiGet<BankPortfolio>(`/api/v1/bank-portfolios/type/${type}`),

};
