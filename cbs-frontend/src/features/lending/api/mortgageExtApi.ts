import { apiPost } from '@/lib/api';
import type { MortgageLoan } from '../types/mortgageExt';

export const mortgagesApi = {
  /** POST /v1/mortgages/{number}/advance */
  advance: (number: string) =>
    apiPost<MortgageLoan>(`/api/v1/mortgages/${number}/advance`),

  /** POST /v1/mortgages/{number}/overpayment */
  overpay: (number: string) =>
    apiPost<MortgageLoan>(`/api/v1/mortgages/${number}/overpayment`),

  /** POST /v1/mortgages/{number}/revert-svr */
  revertSvr: (number: string) =>
    apiPost<MortgageLoan>(`/api/v1/mortgages/${number}/revert-svr`),

};
