import { apiGet, apiPost } from '@/lib/api';
import type { InvestmentPortfolio, InvestmentValuation } from '../types/investmentAccounting';

export const investmentAccountingApi = {
  /** POST /v1/investment-accounting/portfolios */
  createPortfolio: (data: Partial<InvestmentPortfolio>) =>
    apiPost<InvestmentPortfolio>('/api/v1/investment-accounting/portfolios', data),

  /** GET /v1/investment-accounting/portfolios */
  getPortfolios: (params?: Record<string, unknown>) =>
    apiGet<InvestmentPortfolio[]>('/api/v1/investment-accounting/portfolios', params),

  /** GET /v1/investment-accounting/valuations/{portfolioCode}/{date} */
  getValuations: (portfolioCode: string, date: string) =>
    apiGet<InvestmentValuation[]>(`/api/v1/investment-accounting/valuations/${portfolioCode}/${date}`),

};
