import { apiUpload } from '@/lib/api';

export const casesApi = {
  /** POST /v1/cases/{caseNumber}/attachments (multipart file upload) */
  addAttachment: (caseNumber: string, file: File) =>
    apiUpload<Record<string, unknown>>(`/api/v1/cases/${caseNumber}/attachments`, file),
};
