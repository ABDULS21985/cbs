import { apiPost } from '@/lib/api';

export const casesApi = {
  /** POST /v1/cases/{caseNumber}/attachments */
  addAttachment: (caseNumber: string, data: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>(`/api/v1/cases/${caseNumber}/attachments`, data),

};
