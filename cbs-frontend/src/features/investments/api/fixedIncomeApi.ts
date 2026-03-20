import { apiGet, apiPost } from '@/lib/api';
import type { BankPortfolio } from '../types/bankPortfolio';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BondHolding {
  id: number;
  holdingRef: string;
  securityType: string;
  isinCode: string;
  securityName: string;
  issuerName: string;
  issuerType: string;
  faceValue: number;
  units: number;
  purchasePrice: number;
  purchaseYield: number;
  cleanPrice: number;
  dirtyPrice: number;
  marketPrice: number;
  currencyCode: string;
  couponRate: number;
  couponFrequency: string;
  dayCountConvention: string;
  nextCouponDate: string;
  purchaseDate: string;
  settlementDate: string;
  maturityDate: string;
  accruedInterest: number;
  lastAccrualDate: string;
  amortisedCost: number;
  premiumDiscount: number;
  mtmValue: number;
  unrealisedGainLoss: number;
  lastMtmDate: string;
  portfolioCode: string;
  status: string;
  createdAt: string;
}

export interface BatchResult {
  processed: number;
  failed: number;
  totalAmount?: number;
  runAt?: string;
  status?: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const fixedIncomeApi = {
  // Holdings
  getHoldings: () => apiGet<BondHolding[]>('/api/v1/fixed-income/holdings').catch(() => []),
  getHolding: (id: number) => apiGet<BondHolding>(`/api/v1/fixed-income/holdings/${id}`),
  addHolding: (data: Partial<BondHolding>) => apiPost<BondHolding>('/api/v1/fixed-income/holdings', data),
  getPortfolioHoldings: (code: string) => apiGet<BondHolding[]>(`/api/v1/fixed-income/portfolio/${code}`).catch(() => []),
  getPortfolioFaceValue: (code: string) => apiGet<{ totalFaceValue: number }>(`/api/v1/fixed-income/portfolio/${code}/face-value`),

  // Batch operations
  getBatchAccrualStatus: () => apiGet<BatchResult>('/api/v1/fixed-income/batch/accrual').catch(() => null),
  getBatchMtmStatus: () => apiGet<BatchResult>('/api/v1/fixed-income/batch/mtm').catch(() => null),
  getBatchMaturityStatus: () => apiGet<BatchResult>('/api/v1/fixed-income/batch/maturity').catch(() => null),
  getBatchCouponStatus: () => apiGet<BatchResult>('/api/v1/fixed-income/batch/coupons').catch(() => null),
  runBatchAccrual: () => apiPost<BatchResult>('/api/v1/fixed-income/batch/accrual'),
  runBatchMtm: () => apiPost<BatchResult>('/api/v1/fixed-income/batch/mtm'),
  runBatchMaturity: () => apiPost<BatchResult>('/api/v1/fixed-income/batch/maturity'),
  runBatchCoupons: () => apiPost<BatchResult>('/api/v1/fixed-income/batch/coupons'),
};

export const bankPortfolioApi = {
  getAll: () => apiGet<BankPortfolio[]>('/api/v1/bank-portfolios').catch(() => []),
  create: (data: Partial<BankPortfolio>) => apiPost<BankPortfolio>('/api/v1/bank-portfolios', data),
  getByType: (type: string) => apiGet<BankPortfolio[]>(`/api/v1/bank-portfolios/type/${type}`).catch(() => []),
};
