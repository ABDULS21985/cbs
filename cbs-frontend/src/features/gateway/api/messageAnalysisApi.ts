import { apiGet } from '@/lib/api';
import type { MessageAnalysis } from '../types/messageAnalysis';

export const messageAnalysisApi = {
  /** GET /v1/message-analysis/message/{ref} */
  analyze: (ref: string) =>
    apiGet<MessageAnalysis>(`/api/v1/message-analysis/message/${ref}`),

  /** GET /v1/message-analysis/action-required */
  actionRequired: (params?: Record<string, unknown>) =>
    apiGet<MessageAnalysis[]>('/api/v1/message-analysis/action-required', params),

};
