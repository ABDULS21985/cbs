import { apiGet } from '@/lib/api';
import type { RiskContribution } from '../types/riskContribution';

export const riskContributionApi = {
  /** GET /v1/risk-contribution/portfolio/{code}/{date} */
  calculate: (code: string, date: string) =>
    apiGet<RiskContribution>(`/api/v1/risk-contribution/portfolio/${code}/${date}`),

  /** GET /v1/risk-contribution/business-unit/{bu}/{date} */
  getByBU: (bu: string, date: string) =>
    apiGet<RiskContribution[]>(`/api/v1/risk-contribution/business-unit/${bu}/${date}`),

};
