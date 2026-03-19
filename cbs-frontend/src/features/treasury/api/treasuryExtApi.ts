import { apiPost } from '@/lib/api';

export const treasuryApi = {
  /** POST /v1/treasury/deals/batch/maturity */
  processMaturity: () =>
    apiPost<Record<string, unknown>>('/api/v1/treasury/deals/batch/maturity'),

};
