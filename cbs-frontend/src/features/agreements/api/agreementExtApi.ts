import { apiPost } from '@/lib/api';
import type { CustomerAgreement } from '../types/agreementExt';

export const agreementsApi = {
  /** POST /v1/agreements/{number}/activate */
  activate: (number: string) =>
    apiPost<CustomerAgreement>(`/api/v1/agreements/${number}/activate`),

};
