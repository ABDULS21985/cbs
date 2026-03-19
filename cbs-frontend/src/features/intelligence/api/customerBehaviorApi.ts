import { apiGet } from '@/lib/api';
import type { CustomerBehaviorModel } from '../types/customerBehavior';

export const customerBehaviorApi = {
  /** GET /v1/customer-behavior/customer/{id} */
  getCurrentModels: (id: number) =>
    apiGet<CustomerBehaviorModel[]>(`/api/v1/customer-behavior/customer/${id}`),

  /** GET /v1/customer-behavior/customer/{id}/type/{type} */
  getByType: (id: number, type: string) =>
    apiGet<CustomerBehaviorModel>(`/api/v1/customer-behavior/customer/${id}/type/${type}`),

};
