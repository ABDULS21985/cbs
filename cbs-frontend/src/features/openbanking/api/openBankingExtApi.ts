import { apiGet } from '@/lib/api';
import type { ApiConsent } from '../types/openBankingExt';

export const openbankingApi = {
  /** GET /v1/openbanking/consents */
  listConsents: (params?: Record<string, unknown>) =>
    apiGet<ApiConsent[]>('/api/v1/openbanking/consents', params),

};
