import { apiGet } from '@/lib/api';
import type { WealthManagementPlan } from '../types/wealthExt';

export const wealthManagementApi = {
  /** GET /v1/wealth-management/customer/{customerId} */
  getByCustomer: (customerId: number) =>
    apiGet<WealthManagementPlan[]>(`/api/v1/wealth-management/customer/${customerId}`),

  /** GET /v1/wealth-management/advisor/{advisorId} */
  getByAdvisor: (advisorId: number) =>
    apiGet<WealthManagementPlan[]>(`/api/v1/wealth-management/advisor/${advisorId}`),

};
